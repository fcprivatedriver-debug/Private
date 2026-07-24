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
import {
  maybeAutoSaveFromSurplus,
  addMemoryRule,
  getNinaSpace,
} from "@/actions/household";
import { applySavingsTransfer } from "@/lib/savings-transfer";
import {
  learnScopeHabit,
  parseMemoryRuleCommand,
  resolveScope,
} from "@/lib/ai/learning";
import type { FinanceScope } from "@prisma/client";

async function loadNinaRaw(
  familyId: string,
  userName: string,
  opts: { householdName?: string; memberId: string; space: "personal" | "family" },
) {
  const { year, month } = currentYearMonth();
  const { start, end } = monthBounds(year, month);
  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const prevBounds = monthBounds(prev.year, prev.month);

  const scope: FinanceScope = opts.space === "family" ? "FAMILY" : "PERSONAL";
  const scopeWhere =
    opts.space === "family"
      ? { scope: "FAMILY" as const }
      : { scope: "PERSONAL" as const, memberId: opts.memberId };

  const [incomes, expenses, prevExpenses, prevIncomes, budgets, goals, recurring, members] =
    await Promise.all([
      prisma.income.findMany({ where: { familyId, date: { gte: start, lte: end }, ...scopeWhere } }),
      prisma.expense.findMany({
        where: { familyId, date: { gte: start, lte: end }, ...scopeWhere },
        include: { category: true, member: true },
        orderBy: { date: "desc" },
      }),
      prisma.expense.findMany({
        where: { familyId, date: { gte: prevBounds.start, lte: prevBounds.end }, ...scopeWhere },
      }),
      prisma.income.findMany({
        where: { familyId, date: { gte: prevBounds.start, lte: prevBounds.end }, ...scopeWhere },
      }),
      prisma.budget.findMany({ where: { familyId, year, month } }),
      prisma.savingsGoal.findMany({
        where:
          opts.space === "family"
            ? { familyId, scope: "FAMILY" }
            : { familyId, OR: [{ scope: "PERSONAL", ownerMemberId: opts.memberId }, { scope: "PERSONAL", ownerMemberId: null }] },
      }),
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

  void scope;
  return buildNinaContextFromRaw({
    userName,
    householdName: opts.householdName,
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
    unusual: [],
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
  return categories.find((c) => c.slug.includes("outros")) || categories[0];
}

export type PendingScopeAction = {
  kind: "expense" | "income";
  amountCents: number;
  storeName?: string;
  categoryHint?: string;
  description: string;
  question: string;
};

async function commitExpense(opts: {
  familyId: string;
  membershipId: string;
  userId: string;
  amountCents: number;
  storeName?: string;
  categoryHint?: string;
  description: string;
  scope: FinanceScope;
}) {
  const cat = await resolveCategoryId(opts.familyId, opts.categoryHint, "EXPENSE");
  const now = new Date();
  let storeId: string | undefined;
  if (opts.storeName) {
    const normalized = opts.storeName.trim().toLowerCase();
    const store = await prisma.store.upsert({
      where: {
        familyId_normalizedName: { familyId: opts.familyId, normalizedName: normalized },
      },
      create: { familyId: opts.familyId, name: opts.storeName, normalizedName: normalized },
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
      scope: opts.scope,
      amountCents: opts.amountCents,
      date: now,
      time: now.toTimeString().slice(0, 5),
      description: opts.description,
      storeName: opts.storeName,
      paymentMethod: "OTHER",
      notes: "Registado com a Nina",
    },
  });
  await learnScopeHabit({
    userId: opts.userId,
    familyId: opts.familyId,
    storeName: opts.storeName,
    categoryHint: opts.categoryHint,
    scope: opts.scope,
  });
  return { cat, now };
}

export async function askNina(question: string, confirmScope?: FinanceScope) {
  const { session, membership, family } = await requireFamilyContext();
  const displayName = membership.displayName || session.user.name || "olá";
  const space = await getNinaSpace();

  // Memory rule command
  const intent = parseMoneyIntent(question);
  if (intent?.kind === "memory_rule") {
    const parsed = parseMemoryRuleCommand(question);
    if (parsed) {
      await addMemoryRule(parsed);
      return {
        ok: true as const,
        reply: {
          text: `Perfeito. A partir de agora, quando disseres “${parsed.triggerPhrase}”, registo automaticamente em ${
            parsed.scope === "FAMILY" ? "Conta Familiar" : "As Minhas Finanças"
          }${parsed.categorySlug ? ` (${parsed.categorySlug})` : ""}.\n\nPodes editar estas regras em Memória.`,
          tone: "celebrate" as const,
          suggestions: ["Gastei 35 € no Continente para casa", "Café 1,20 €"],
          didMutate: true,
        },
        mutated: true,
      };
    }
  }

  if (intent?.kind === "need_amount") {
    return {
      ok: true as const,
      reply: {
        text: intent.hint,
        tone: "warm" as const,
        suggestions: ["Recebi o salário, 1850 euros", "Recebi 200 euros"],
      },
      mutated: false,
    };
  }

  if (intent && intent.kind !== "memory_rule" && canEditFinances(membership.role)) {
    if (intent.kind === "expense") {
      const decision = await resolveScope({
        userId: session.user.id,
        familyId: family.id,
        raw: question,
        storeName: intent.storeName,
        categoryHint: intent.categoryHint,
        explicitScope: confirmScope ?? intent.explicitScope,
      });

      if (decision.needsConfirm && !confirmScope) {
        const pending: PendingScopeAction = {
          kind: "expense",
          amountCents: intent.amountCents,
          storeName: intent.storeName,
          categoryHint: intent.categoryHint,
          description: intent.description,
          question,
        };
        return {
          ok: true as const,
          reply: {
            text: `Queres registar ${formatEUR(intent.amountCents)}${
              intent.storeName ? ` (${intent.storeName})` : ""
            } nas tuas finanças pessoais ou na Conta Familiar?`,
            tone: "warm" as const,
            suggestions: ["Pessoal", "Familiar"],
            didMutate: false,
            pendingScope: pending,
          },
          mutated: false,
          pendingScope: pending,
        };
      }

      const scope = confirmScope ?? decision.scope ?? "PERSONAL";
      const { cat, now } = await commitExpense({
        familyId: family.id,
        membershipId: membership.id,
        userId: session.user.id,
        amountCents: intent.amountCents,
        storeName: intent.storeName,
        categoryHint: intent.categoryHint,
        description: intent.description,
        scope,
      });

      const where =
        scope === "FAMILY" ? "na Conta Familiar" : "nas tuas finanças pessoais";
      const tip = scope === "FAMILY" ? await maybeAutoSaveFromSurplus(family.id) : null;
      let extra = `\n\n${decision.reason}`;
      if (tip?.underBudget && tip.suggestedSaveCents > 0) {
        extra += `\nSe quiserem, posso meter ${formatEUR(tip.suggestedSaveCents)} no objetivo familiar — diz “poupei ${formatEUR(tip.suggestedSaveCents)}”.`;
      }

      revalidatePath("/", "layout");
      return {
        ok: true as const,
        reply: {
          text: `Feito, ${displayName}. Registei ${formatEUR(intent.amountCents)} ${where} · ${cat.name} · ${now.toLocaleDateString("pt-PT")} ${now.toTimeString().slice(0, 5)}.${extra}`,
          tone: "warm" as const,
          suggestions: ["Quanto gastei este mês?", "Onde posso poupar?"],
          didMutate: true,
        } satisfies NinaReply,
        mutated: true,
      };
    }

    if (intent.kind === "income") {
      const scope = confirmScope ?? intent.explicitScope ?? "PERSONAL";
      const cat = await resolveCategoryId(family.id, intent.categoryHint, "INCOME");
      await prisma.income.create({
        data: {
          familyId: family.id,
          memberId: membership.id,
          createdById: session.user.id,
          categoryId: cat.id,
          scope,
          amountCents: intent.amountCents,
          date: new Date(),
          description: intent.description,
        },
      });
      revalidatePath("/", "layout");
      return {
        ok: true as const,
        reply: {
          text: `Ótimo. Entrou ${formatEUR(intent.amountCents)} em ${
            scope === "FAMILY" ? "Conta Familiar" : "As Minhas Finanças"
          }.`,
          tone: "celebrate" as const,
          didMutate: true,
        },
        mutated: true,
      };
    }

    if (intent.kind === "save") {
      const transferred = await applySavingsTransfer(family.id, intent.amountCents, intent.goalHint);
      revalidatePath("/", "layout");
      const target =
        transferred.ok ? ` em “${transferred.targetName}”` : " na tua poupança";
      return {
        ok: true as const,
        reply: {
          text: `Feito. Coloquei ${formatEUR(intent.amountCents)}${target}. Os saldos já estão atualizados.`,
          tone: "celebrate" as const,
          didMutate: true,
          suggestions: ["Quanto falta para as férias?", "Onde posso poupar?"],
        },
        mutated: true,
      };
    }
  } else if (intent && !canEditFinances(membership.role)) {
    return {
      ok: true as const,
      reply: {
        text: `${displayName}, a tua permissão é só de consulta. Pede a um administrador para te tornar editor.`,
        tone: "careful" as const,
      },
      mutated: false,
    };
  }

  const ctx = await loadNinaRaw(family.id, displayName, {
    householdName: family.name,
    memberId: membership.id,
    space,
  });
  const reply = answerNina(question, ctx);
  await prisma.aiInsight.create({
    data: {
      familyId: family.id,
      userId: session.user.id,
      kind: "chat",
      title: question.slice(0, 120),
      body: reply.text,
      severity: "info",
    },
  });
  return { ok: true as const, reply, mutated: false };
}

export async function confirmPendingExpense(
  pending: PendingScopeAction,
  scope: FinanceScope,
) {
  return askNina(pending.question, scope);
}

export async function getNinaGreeting() {
  const { session, membership, family } = await requireFamilyContext();
  const space = await getNinaSpace();
  const ctx = await loadNinaRaw(family.id, membership.displayName || session.user.name || "olá", {
    householdName: family.name,
    memberId: membership.id,
    space,
  });
  const base = greeting(ctx);
  const spaceLabel = space === "family" ? "Conta Familiar" : "As Minhas Finanças";
  return {
    ok: true as const,
    reply: {
      ...base,
      text: `${base.text}\n\nEstás a ver: **${spaceLabel}**.`,
      suggestions: [
        "Gastei 85 € no Continente para casa",
        "Café 2 €",
        "Quanto gastei este mês?",
        "Onde posso poupar?",
      ],
    },
    ctx,
    space,
  };
}

export async function getSmartSuggestions() {
  const { session, membership, family } = await requireFamilyContext();
  const space = await getNinaSpace();
  const { year, month } = currentYearMonth();
  const { start, end } = monthBounds(year, month);
  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const prevBounds = monthBounds(prev.year, prev.month);

  const scopeWhere =
    space === "family"
      ? { scope: "FAMILY" as const }
      : { scope: "PERSONAL" as const, memberId: membership.id };

  const [exp, prevExp, goals] = await Promise.all([
    prisma.expense.findMany({
      where: { familyId: family.id, date: { gte: start, lte: end }, ...scopeWhere },
      include: { category: true },
    }),
    prisma.expense.findMany({
      where: {
        familyId: family.id,
        date: { gte: prevBounds.start, lte: prevBounds.end },
        ...scopeWhere,
      },
      include: { category: true },
    }),
    prisma.savingsGoal.findMany({
      where: space === "family" ? { familyId: family.id, scope: "FAMILY" } : { familyId: family.id, scope: "PERSONAL" },
    }),
  ]);

  const suggestions: { title: string; body: string; tone: string }[] = [];
  const total = exp.reduce((s, e) => s + e.amountCents, 0);
  const prevTotal = prevExp.reduce((s, e) => s + e.amountCents, 0);

  const resto = exp.filter((e) => /restaurante/i.test(e.category.name));
  const prevResto = prevExp.filter((e) => /restaurante/i.test(e.category.name));
  const restoSum = resto.reduce((s, e) => s + e.amountCents, 0);
  const prevRestoSum = prevResto.reduce((s, e) => s + e.amountCents, 0);
  if (prevRestoSum > 0 && restoSum < prevRestoSum) {
    const pct = Math.round(((prevRestoSum - restoSum) / prevRestoSum) * 100);
    suggestions.push({
      title: `Menos ${pct}% em restaurantes`,
      body: "Excelente! Continuas no caminho certo.",
      tone: "celebrate",
    });
  }

  if (prevTotal > 0 && total < prevTotal) {
    suggestions.push({
      title: "Este mês já poupaste mais do que no mês passado",
      body: `Gastaste ${formatEUR(prevTotal - total)} a menos até agora.`,
      tone: "success",
    });
  }

  const superToday = exp.some(
    (e) =>
      /super|continente|pingo/i.test(e.storeName || e.description) &&
      e.date.toDateString() === new Date().toDateString(),
  );
  const usuallySuper = await prisma.ninaHabitStat.findFirst({
    where: {
      userId: session.user.id,
      familyId: family.id,
      keyType: "store",
      keyValue: { in: ["continente", "pingo doce"] },
      familyCount: { gte: 2 },
    },
  });
  if (!superToday && usuallySuper && new Date().getDay() === 6) {
    suggestions.push({
      title: "Compras do supermercado?",
      body: "Hoje ainda não registaste as compras habituais. Queres adicioná-las?",
      tone: "info",
    });
  }

  for (const g of goals) {
    if (g.targetCents <= 0) continue;
    const pct = g.currentCents / g.targetCents;
    if (pct >= 0.7 && pct < 1) {
      suggestions.push({
        title: `Objetivo “${g.name}” quase lá`,
        body: "Se continuares assim, podes chegar mais cedo do que pensavas.",
        tone: "celebrate",
      });
    }
  }

  const unusual = exp.filter((e) => e.amountCents >= 15000);
  if (unusual[0]) {
    suggestions.push({
      title: "Despesa invulgar",
      body: `Detetei ${formatEUR(unusual[0].amountCents)} em “${unusual[0].description}”. Queres confirmar se está correta?`,
      tone: "warning",
    });
  }

  return { ok: true as const, suggestions: suggestions.slice(0, 4) };
}

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
