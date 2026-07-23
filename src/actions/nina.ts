"use server";

import { revalidatePath } from "next/cache";
import { requireFamilyContext } from "@/lib/session";
import { prisma } from "@/lib/db";
import { currentYearMonth, monthBounds, formatEUR } from "@/lib/money";
import {
  answerNina,
  buildNinaContextFromRaw,
  greeting,
  type NinaReply,
} from "@/lib/ai/nina-assistant";
import { parseMoneyIntent } from "@/lib/ai/parse-intent";
import { canEditFinances } from "@/domain/household";
import { contributeSharedGoals, maybeAutoSaveFromSurplus } from "@/actions/household";

async function loadNinaRaw(familyId: string, userName: string, householdName?: string) {
  const { year, month } = currentYearMonth();
  const { start, end } = monthBounds(year, month);
  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const prevBounds = monthBounds(prev.year, prev.month);

  const [incomes, expenses, prevExpenses, prevIncomes, budgets, goals, recurring, members] =
    await Promise.all([
      prisma.income.findMany({ where: { familyId, date: { gte: start, lte: end } } }),
      prisma.expense.findMany({
        where: { familyId, date: { gte: start, lte: end } },
        include: { category: true, member: true },
        orderBy: { date: "desc" },
      }),
      prisma.expense.findMany({
        where: { familyId, date: { gte: prevBounds.start, lte: prevBounds.end } },
      }),
      prisma.income.findMany({
        where: { familyId, date: { gte: prevBounds.start, lte: prevBounds.end } },
      }),
      prisma.budget.findMany({ where: { familyId, year, month } }),
      prisma.savingsGoal.findMany({ where: { familyId } }),
      prisma.recurringPayment.findMany({
        where: { familyId, isActive: true },
        orderBy: { nextDueDate: "asc" },
        take: 6,
      }),
      prisma.familyMember.findMany({ where: { familyId } }),
    ]);

  const incomeCents = incomes.reduce((s, i) => s + i.amountCents, 0);
  const expenseCents = expenses.reduce((s, i) => s + i.amountCents, 0);
  const catMap = new Map<string, { name: string; cents: number; slug?: string }>();
  const storeMap = new Map<string, number>();
  for (const e of expenses) {
    const prevC = catMap.get(e.category.name);
    catMap.set(e.category.name, {
      name: e.category.name,
      slug: e.category.slug,
      cents: (prevC?.cents ?? 0) + e.amountCents,
    });
    const store = e.storeName || "Outros";
    storeMap.set(store, (storeMap.get(store) ?? 0) + e.amountCents);
  }

  const byDesc = new Map<string, number[]>();
  for (const e of [...expenses, ...prevExpenses]) {
    const arr = byDesc.get(e.description) ?? [];
    arr.push(e.amountCents);
    byDesc.set(e.description, arr);
  }
  const unusual = expenses
    .map((e) => {
      const arr = byDesc.get(e.description) ?? [e.amountCents];
      const avg = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
      return { description: e.description, amountCents: e.amountCents, avg };
    })
    .filter((u) => u.amountCents > u.avg * 1.5)
    .slice(0, 3);

  return buildNinaContextFromRaw({
    userName,
    householdName,
    memberCount: members.length,
    incomeCents,
    expenseCents,
    prevExpenseCents: prevExpenses.reduce((s, i) => s + i.amountCents, 0),
    prevIncomeCents: prevIncomes.reduce((s, i) => s + i.amountCents, 0),
    budgetLimitCents: budgets.reduce((s, b) => s + b.limitCents, 0),
    categoryBreakdown: [...catMap.values()].sort((a, b) => b.cents - a.cents),
    storeBreakdown: [...storeMap.entries()]
      .map(([name, cents]) => ({ name, cents }))
      .sort((a, b) => b.cents - a.cents),
    goals: goals.map((g) => ({
      name: g.name,
      currentCents: g.currentCents,
      targetCents: g.targetCents,
    })),
    upcomingPayments: recurring.map((r) => ({
      name: r.name,
      amountCents: r.amountCents,
      due: r.nextDueDate,
    })),
    unusual,
    recentExpenses: expenses.slice(0, 12).map((e) => ({
      description: e.description,
      storeName: e.storeName,
      amountCents: e.amountCents,
      category: e.category.name,
      memberName: e.member?.displayName ?? null,
    })),
  });
}

async function resolveCategoryId(familyId: string, slugHint: string | undefined, kind: "EXPENSE" | "INCOME") {
  const categories = await prisma.category.findMany({ where: { familyId, kind } });
  if (slugHint) {
    const hit = categories.find((c) => c.slug === slugHint || c.name.toLowerCase().includes(slugHint));
    if (hit) return hit;
  }
  return (
    categories.find((c) => c.slug.includes("outros") || c.slug.includes("other")) ||
    categories[0]
  );
}

async function applyIntent(
  question: string,
  opts: {
    familyId: string;
    membershipId: string;
    userId: string;
    displayName: string;
    role: import("@prisma/client").FamilyRole;
  },
): Promise<NinaReply | null> {
  const intent = parseMoneyIntent(question);
  if (!intent) return null;

  if (!canEditFinances(opts.role)) {
    return {
      text: `${opts.displayName}, a tua permissão é só de consulta. Pede a um administrador para te tornar editor — assim podes registar gastos à conversa.`,
      tone: "careful",
      suggestions: ["Quanto gastei este mês?", "Onde posso poupar?"],
      didMutate: false,
    };
  }

  const now = new Date();
  const time = now.toTimeString().slice(0, 5);

  if (intent.kind === "expense") {
    const cat = await resolveCategoryId(opts.familyId, intent.categoryHint, "EXPENSE");
    let storeId: string | undefined;
    if (intent.storeName) {
      const normalized = intent.storeName.trim().toLowerCase();
      const store = await prisma.store.upsert({
        where: {
          familyId_normalizedName: { familyId: opts.familyId, normalizedName: normalized },
        },
        create: {
          familyId: opts.familyId,
          name: intent.storeName,
          normalizedName: normalized,
        },
        update: {},
      });
      storeId = store.id;
    }

    await prisma.expense.create({
      data: {
        familyId: opts.familyId,
        memberId: opts.membershipId,
        createdById: opts.userId,
        categoryId: cat.id,
        storeId,
        amountCents: intent.amountCents,
        date: now,
        time,
        description: intent.description,
        storeName: intent.storeName,
        paymentMethod: "OTHER",
        notes: `Registado por voz/texto com a Nina`,
      },
    });

    const tip = await maybeAutoSaveFromSurplus(opts.familyId);
    let extra = `\n\nJá atualizei a conta partilhada — todos os membros vão ver isto em tempo real.`;
    if (tip?.underBudget && tip.suggestedSaveCents > 0) {
      extra += `\n\nBoa notícia: ainda estão abaixo do plano. Se quiserem, posso meter ${formatEUR(tip.suggestedSaveCents)} no objetivo de poupança — basta dizer “Nina, poupei ${formatEUR(tip.suggestedSaveCents)}”.`;
    }

    return {
      text: `Percebi, ${opts.displayName}. Registei ${formatEUR(intent.amountCents)}${
        intent.storeName ? ` em ${intent.storeName}` : ""
      } (${cat.name}) · ${now.toLocaleDateString("pt-PT")} ${time}.${extra}`,
      tone: "warm",
      suggestions: ["Quanto gastei este mês?", "Onde posso poupar?", "Quanto falta para as férias?"],
      didMutate: true,
    };
  }

  if (intent.kind === "income") {
    const cat = await resolveCategoryId(opts.familyId, intent.categoryHint, "INCOME");
    await prisma.income.create({
      data: {
        familyId: opts.familyId,
        memberId: opts.membershipId,
        createdById: opts.userId,
        categoryId: cat.id,
        amountCents: intent.amountCents,
        date: now,
        description: intent.description,
        notes: "Registado por voz/texto com a Nina",
      },
    });
    return {
      text: `Ótimo, ${opts.displayName}. Entrou ${formatEUR(intent.amountCents)} (${cat.name}) na conta partilhada. Toda a gente já consegue ver o saldo atualizado.`,
      tone: "celebrate",
      suggestions: ["Quanto posso gastar até ao final do mês?", "Quanto falta para as férias?"],
      didMutate: true,
    };
  }

  if (intent.kind === "save") {
    await contributeSharedGoals(opts.familyId, intent.amountCents, intent.goalHint);
    const goals = await prisma.savingsGoal.findMany({ where: { familyId: opts.familyId } });
    const g =
      goals.find((x) =>
        intent.goalHint ? x.name.toLowerCase().includes(intent.goalHint.slice(0, 4)) : false,
      ) || goals[0];
    return {
      text: g
        ? `Adorei essa disciplina. Somei ${formatEUR(intent.amountCents)} ao objetivo “${g.name}” — agora estão em ${formatEUR(g.currentCents)} de ${formatEUR(g.targetCents)}. A família inteira avança junta.`
        : `Guardei ${formatEUR(intent.amountCents)}. Criem um objetivo partilhado e eu continuo a atualizar o progresso.`,
      tone: "celebrate",
      suggestions: ["Quanto falta para as férias?", "Onde posso poupar?"],
      didMutate: true,
    };
  }

  return null;
}

export async function askNina(question: string) {
  const { session, membership, family } = await requireFamilyContext();
  const displayName = membership.displayName || session.user.name || "olá";

  const intentReply = await applyIntent(question, {
    familyId: family.id,
    membershipId: membership.id,
    userId: session.user.id,
    displayName,
    role: membership.role,
  });

  const ctx = await loadNinaRaw(family.id, displayName, family.name);
  const reply = intentReply ?? answerNina(question, ctx);

  await prisma.aiInsight.create({
    data: {
      familyId: family.id,
      userId: session.user.id,
      kind: intentReply?.didMutate ? "chat-mutate" : "chat",
      title: question.slice(0, 120),
      body: reply.text,
      severity:
        reply.tone === "careful" ? "warning" : reply.tone === "celebrate" ? "success" : "info",
    },
  });

  if (intentReply?.didMutate) {
    revalidatePath("/", "layout");
  }

  return { ok: true as const, reply, mutated: Boolean(intentReply?.didMutate) };
}

export async function getNinaGreeting() {
  const { session, membership, family } = await requireFamilyContext();
  const ctx = await loadNinaRaw(
    family.id,
    membership.displayName || session.user.name || "olá",
    family.name,
  );
  return { ok: true as const, reply: greeting(ctx), ctx };
}

/** Snapshot leve para sincronização em tempo quase-real entre membros. */
export async function getHouseholdSyncSnapshot() {
  const { family } = await requireFamilyContext();
  const { year, month } = currentYearMonth();
  const { start, end } = monthBounds(year, month);

  const [incomeAgg, expenseAgg, lastExpense, goals, memberCount] = await Promise.all([
    prisma.income.aggregate({
      where: { familyId: family.id, date: { gte: start, lte: end } },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: { familyId: family.id, date: { gte: start, lte: end } },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.expense.findFirst({
      where: { familyId: family.id },
      orderBy: { createdAt: "desc" },
      include: { member: true, category: true },
    }),
    prisma.savingsGoal.findMany({ where: { familyId: family.id } }),
    prisma.familyMember.count({ where: { familyId: family.id } }),
  ]);

  return {
    ok: true as const,
    snapshot: {
      updatedAt: Date.now(),
      incomeCents: incomeAgg._sum.amountCents ?? 0,
      expenseCents: expenseAgg._sum.amountCents ?? 0,
      incomeCount: incomeAgg._count,
      expenseCount: expenseAgg._count,
      memberCount,
      lastExpense: lastExpense
        ? {
            id: lastExpense.id,
            amountCents: lastExpense.amountCents,
            description: lastExpense.description,
            member: lastExpense.member?.displayName ?? null,
            category: lastExpense.category.name,
            createdAt: lastExpense.createdAt.toISOString(),
          }
        : null,
      goals: goals.map((g) => ({
        id: g.id,
        name: g.name,
        currentCents: g.currentCents,
        targetCents: g.targetCents,
      })),
    },
  };
}
