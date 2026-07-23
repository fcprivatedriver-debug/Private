"use server";

import { requireFamilyContext } from "@/lib/session";
import { prisma } from "@/lib/db";
import { currentYearMonth, monthBounds } from "@/lib/money";
import { answerNina, buildNinaContextFromRaw, greeting } from "@/lib/ai/nina-assistant";

async function loadNinaRaw(familyId: string, userName: string) {
  const { year, month } = currentYearMonth();
  const { start, end } = monthBounds(year, month);
  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const prevBounds = monthBounds(prev.year, prev.month);

  const [incomes, expenses, prevExpenses, prevIncomes, budgets, goals, recurring] =
    await Promise.all([
      prisma.income.findMany({ where: { familyId, date: { gte: start, lte: end } } }),
      prisma.expense.findMany({
        where: { familyId, date: { gte: start, lte: end } },
        include: { category: true },
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
    ]);

  const incomeCents = incomes.reduce((s, i) => s + i.amountCents, 0);
  const expenseCents = expenses.reduce((s, i) => s + i.amountCents, 0);
  const catMap = new Map<string, { name: string; cents: number; slug?: string }>();
  const storeMap = new Map<string, number>();
  for (const e of expenses) {
    const prev = catMap.get(e.category.name);
    catMap.set(e.category.name, {
      name: e.category.name,
      slug: e.category.slug,
      cents: (prev?.cents ?? 0) + e.amountCents,
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
    })),
  });
}

export async function askNina(question: string) {
  const { session, membership, family } = await requireFamilyContext();
  const ctx = await loadNinaRaw(
    family.id,
    membership.displayName || session.user.name || "olá",
  );
  const reply = answerNina(question, ctx);

  await prisma.aiInsight.create({
    data: {
      familyId: family.id,
      userId: session.user.id,
      kind: "chat",
      title: question.slice(0, 120),
      body: reply.text,
      severity: reply.tone === "careful" ? "warning" : reply.tone === "celebrate" ? "success" : "info",
    },
  });

  return { ok: true as const, reply };
}

export async function getNinaGreeting() {
  const { session, membership, family } = await requireFamilyContext();
  const ctx = await loadNinaRaw(
    family.id,
    membership.displayName || session.user.name || "olá",
  );
  return { ok: true as const, reply: greeting(ctx), ctx };
}
