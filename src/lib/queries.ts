import { prisma } from "@/lib/db";
import { currentYearMonth, monthBounds, monthLabel } from "@/lib/money";
import { computeDashboardTotals, groupByCategory, goalProgress } from "@/domain/finance";
import { PAYMENT_METHOD_LABELS } from "@/domain/categories";

export async function getDashboardData(familyId: string) {
  const { year, month } = currentYearMonth();
  const { start, end } = monthBounds(year, month);

  const [
    incomes,
    expenses,
    budgets,
    goals,
    recurring,
    alerts,
    insights,
    members,
    accounts,
  ] = await Promise.all([
    prisma.income.findMany({
      where: { familyId, date: { gte: start, lte: end } },
      include: { category: true, member: true },
    }),
    prisma.expense.findMany({
      where: { familyId, date: { gte: start, lte: end } },
      include: { category: true, member: true, account: true },
      orderBy: { date: "desc" },
    }),
    prisma.budget.findMany({
      where: { familyId, year, month },
      include: { category: true },
    }),
    prisma.savingsGoal.findMany({
      where: { familyId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.recurringPayment.findMany({
      where: { familyId, isActive: true },
      include: { category: true },
      orderBy: { nextDueDate: "asc" },
      take: 8,
    }),
    prisma.alert.findMany({
      where: { familyId, isRead: false },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.aiInsight.findMany({
      where: { familyId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.familyMember.findMany({ where: { familyId } }),
    prisma.financeAccount.findMany({ where: { familyId, isActive: true } }),
  ]);

  const incomeCents = incomes.reduce((s, i) => s + i.amountCents, 0);
  const expenseCents = expenses.reduce((s, i) => s + i.amountCents, 0);
  const budgetLimitCents = budgets.reduce((s, b) => s + b.limitCents, 0);
  const totals = computeDashboardTotals({ incomeCents, expenseCents, budgetLimitCents });

  const categoryChart = groupByCategory(
    expenses.map((e) => ({
      categoryName: e.category.name,
      color: e.category.color,
      amountCents: e.amountCents,
    })),
  );

  // Evolução últimos 6 meses
  const evolution = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const b = monthBounds(y, m);
    const [inc, exp] = await Promise.all([
      prisma.income.aggregate({
        where: { familyId, date: { gte: b.start, lte: b.end } },
        _sum: { amountCents: true },
      }),
      prisma.expense.aggregate({
        where: { familyId, date: { gte: b.start, lte: b.end } },
        _sum: { amountCents: true },
      }),
    ]);
    evolution.push({
      label: monthLabel(y, m).replace(/ de /i, " ").slice(0, 3) + " " + String(y).slice(2),
      incomeCents: inc._sum.amountCents ?? 0,
      expenseCents: exp._sum.amountCents ?? 0,
    });
  }

  const budgetRows = budgets.map((b) => {
    const used = expenses
      .filter((e) => e.categoryId === b.categoryId)
      .reduce((s, e) => s + e.amountCents, 0);
    return {
      id: b.id,
      name: b.category.name,
      color: b.category.color,
      limitCents: b.limitCents,
      usedCents: used,
      percent: b.limitCents > 0 ? Math.round((used / b.limitCents) * 1000) / 10 : 0,
    };
  });

  return {
    year,
    month,
    monthLabel: monthLabel(year, month),
    totals,
    categoryChart,
    evolution,
    recentExpenses: expenses.slice(0, 8),
    upcomingPayments: recurring,
    goals: goals.map((g) => ({ ...g, progress: goalProgress(g.currentCents, g.targetCents) })),
    budgetRows,
    alerts,
    insights,
    members,
    accounts,
    paymentLabels: PAYMENT_METHOD_LABELS,
  };
}

export async function getExpensesFiltered(
  familyId: string,
  filters: {
    q?: string;
    categoryId?: string;
    store?: string;
    accountId?: string;
    paymentMethod?: string;
    min?: number;
    max?: number;
    from?: string;
    to?: string;
  },
) {
  const where: Record<string, unknown> = { familyId };
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.accountId) where.accountId = filters.accountId;
  if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;
  if (filters.store) where.storeName = { contains: filters.store, mode: "insensitive" };
  if (filters.from || filters.to) {
    where.date = {
      ...(filters.from ? { gte: new Date(filters.from) } : {}),
      ...(filters.to ? { lte: new Date(filters.to) } : {}),
    };
  }
  if (filters.min != null || filters.max != null) {
    where.amountCents = {
      ...(filters.min != null ? { gte: Math.round(filters.min * 100) } : {}),
      ...(filters.max != null ? { lte: Math.round(filters.max * 100) } : {}),
    };
  }
  if (filters.q) {
    where.OR = [
      { description: { contains: filters.q, mode: "insensitive" } },
      { storeName: { contains: filters.q, mode: "insensitive" } },
      { notes: { contains: filters.q, mode: "insensitive" } },
      { category: { name: { contains: filters.q, mode: "insensitive" } } },
    ];
  }

  return prisma.expense.findMany({
    where,
    include: { category: true, account: true, member: true, subcategory: true },
    orderBy: { date: "desc" },
    take: 100,
  });
}

export async function getStatsData(familyId: string) {
  const { year, month } = currentYearMonth();
  const data = await getDashboardData(familyId);

  // Por loja
  const expenses = await prisma.expense.findMany({
    where: { familyId, date: { gte: monthBounds(year, month).start, lte: monthBounds(year, month).end } },
  });
  const byStore = new Map<string, number>();
  const byMethod = new Map<string, number>();
  for (const e of expenses) {
    const store = e.storeName || "Sem loja";
    byStore.set(store, (byStore.get(store) ?? 0) + e.amountCents);
    byMethod.set(e.paymentMethod, (byMethod.get(e.paymentMethod) ?? 0) + e.amountCents);
  }

  // Semanal (últimas 4 semanas)
  const weekly = [];
  for (let i = 3; i >= 0; i--) {
    const end = new Date();
    end.setDate(end.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const sum = await prisma.expense.aggregate({
      where: { familyId, date: { gte: start, lte: end } },
      _sum: { amountCents: true },
    });
    weekly.push({
      label: `S${4 - i}`,
      expenseCents: sum._sum.amountCents ?? 0,
    });
  }

  // Anual por mês
  const annual = [];
  for (let m = 1; m <= 12; m++) {
    const b = monthBounds(year, m);
    const sum = await prisma.expense.aggregate({
      where: { familyId, date: { gte: b.start, lte: b.end } },
      _sum: { amountCents: true },
    });
    annual.push({
      label: monthLabel(year, m).slice(0, 3),
      expenseCents: sum._sum.amountCents ?? 0,
    });
  }

  const goals = await prisma.savingsGoal.findMany({ where: { familyId } });

  return {
    ...data,
    byStore: [...byStore.entries()]
      .map(([name, cents]) => ({ name, cents }))
      .sort((a, b) => b.cents - a.cents)
      .slice(0, 8),
    byMethod: [...byMethod.entries()].map(([name, cents]) => ({
      name: PAYMENT_METHOD_LABELS[name] ?? name,
      cents,
    })),
    weekly,
    annual,
    savingsEvolution: goals.map((g) => ({
      name: g.name,
      current: g.currentCents,
      target: g.targetCents,
      progress: goalProgress(g.currentCents, g.targetCents),
    })),
  };
}
