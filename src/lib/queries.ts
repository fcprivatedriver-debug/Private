import { prisma } from "@/lib/db";
import { currentYearMonth, monthBounds, monthLabel } from "@/lib/money";
import { computeDashboardTotals, groupByCategory, goalProgress } from "@/domain/finance";
import { PAYMENT_METHOD_LABELS } from "@/domain/categories";
import type { NinaSpace } from "@/actions/household";
import { expenseScopeWhere, goalScopeWhere, incomeScopeWhere, potScopeWhere } from "@/lib/scope";
import { computeInvestmentSnapshot } from "@/domain/investments";

export async function getDashboardData(
  familyId: string,
  opts?: { space?: NinaSpace; memberId?: string },
) {
  const space = opts?.space ?? "family";
  const memberId = opts?.memberId ?? "";
  const { year, month } = currentYearMonth();
  const { start, end } = monthBounds(year, month);
  const expWhere = expenseScopeWhere(space, memberId);
  const incWhere = incomeScopeWhere(space, memberId);
  const goalWhere = goalScopeWhere(space, memberId);
  const potWhere = potScopeWhere(space, memberId);

  const [
    incomes,
    expenses,
    budgets,
    goals,
    pots,
    recurring,
    alerts,
    insights,
    members,
    accounts,
  ] = await Promise.all([
    prisma.income.findMany({
      where: { familyId, date: { gte: start, lte: end }, ...incWhere },
      include: { category: true, member: true },
    }),
    prisma.expense.findMany({
      where: { familyId, date: { gte: start, lte: end }, ...expWhere },
      include: { category: true, member: true, account: true },
      orderBy: { date: "desc" },
    }),
    prisma.budget.findMany({
      where: { familyId, year, month },
      include: { category: true },
    }),
    prisma.savingsGoal.findMany({
      where: { familyId, ...goalWhere },
      orderBy: { createdAt: "asc" },
    }),
    prisma.savingPot.findMany({
      where: { familyId, ...potWhere },
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

  const evolution = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const b = monthBounds(y, m);
    const [inc, exp] = await Promise.all([
      prisma.income.aggregate({
        where: { familyId, date: { gte: b.start, lte: b.end }, ...incWhere },
        _sum: { amountCents: true },
      }),
      prisma.expense.aggregate({
        where: { familyId, date: { gte: b.start, lte: b.end }, ...expWhere },
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

  let totalInvestedCents = 0;
  let accruedReturnCents = 0;
  for (const p of pots) {
    if (
      p.isInvested &&
      p.investedCapitalCents != null &&
      p.annualRatePercent != null &&
      p.investmentStartDate
    ) {
      const snap = computeInvestmentSnapshot({
        investedCapitalCents: p.investedCapitalCents,
        annualRatePercent: p.annualRatePercent,
        capitalization: p.capitalization,
        interestPeriod: p.interestPeriod,
        startDate: p.investmentStartDate,
      });
      totalInvestedCents += snap.principalCents;
      accruedReturnCents += snap.accruedInterestCents;
    }
  }

  const activeGoals = goals.filter((g) => !g.isCompleted);
  const completedGoals = goals.filter((g) => g.isCompleted);
  const nextGoal = [...activeGoals].sort((a, b) => {
    const pa = a.currentCents / Math.max(1, a.targetCents);
    const pb = b.currentCents / Math.max(1, b.targetCents);
    return pb - pa;
  })[0];

  return {
    year,
    month,
    monthLabel: monthLabel(year, month),
    space,
    totals,
    categoryChart,
    evolution,
    recentExpenses: expenses.slice(0, 8),
    upcomingPayments: recurring,
    goals: goals.map((g) => ({ ...g, progress: goalProgress(g.currentCents, g.targetCents) })),
    pots: pots.map((p) => ({ ...p, progress: goalProgress(p.currentCents, p.targetCents) })),
    savingsSummary: {
      totalSavingsCents: pots.reduce((s, p) => s + p.currentCents, 0),
      totalInvestedCents,
      accruedReturnCents,
      activeGoals: activeGoals.length,
      completedGoals: completedGoals.length,
      nextGoal: nextGoal
        ? {
            id: nextGoal.id,
            name: nextGoal.name,
            progress: goalProgress(nextGoal.currentCents, nextGoal.targetCents),
            remainingCents: Math.max(0, nextGoal.targetCents - nextGoal.currentCents),
          }
        : null,
      totalStillNeededCents: activeGoals.reduce(
        (s, g) => s + Math.max(0, g.targetCents - g.currentCents),
        0,
      ),
    },
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
    space?: NinaSpace;
    memberId?: string;
  },
) {
  const where: Record<string, unknown> = { familyId };
  if (filters.space && filters.memberId) {
    Object.assign(where, expenseScopeWhere(filters.space, filters.memberId));
  }
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

export async function getStatsData(
  familyId: string,
  opts?: { space?: NinaSpace; memberId?: string },
) {
  const { year, month } = currentYearMonth();
  const data = await getDashboardData(familyId, opts);
  const space = opts?.space ?? "family";
  const memberId = opts?.memberId ?? "";
  const expWhere = expenseScopeWhere(space, memberId);

  const expenses = await prisma.expense.findMany({
    where: {
      familyId,
      date: { gte: monthBounds(year, month).start, lte: monthBounds(year, month).end },
      ...expWhere,
    },
  });
  const byStore = new Map<string, number>();
  const byMethod = new Map<string, number>();
  for (const e of expenses) {
    const store = e.storeName || "Sem loja";
    byStore.set(store, (byStore.get(store) ?? 0) + e.amountCents);
    byMethod.set(e.paymentMethod, (byMethod.get(e.paymentMethod) ?? 0) + e.amountCents);
  }

  const weekly = [];
  for (let i = 3; i >= 0; i--) {
    const end = new Date();
    end.setDate(end.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const sum = await prisma.expense.aggregate({
      where: { familyId, date: { gte: start, lte: end }, ...expWhere },
      _sum: { amountCents: true },
    });
    weekly.push({
      label: `S${4 - i}`,
      expenseCents: sum._sum.amountCents ?? 0,
    });
  }

  const annual = [];
  for (let m = 1; m <= 12; m++) {
    const b = monthBounds(year, m);
    const sum = await prisma.expense.aggregate({
      where: { familyId, date: { gte: b.start, lte: b.end }, ...expWhere },
      _sum: { amountCents: true },
    });
    annual.push({
      label: monthLabel(year, m).slice(0, 3),
      expenseCents: sum._sum.amountCents ?? 0,
    });
  }

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
    savingsEvolution: data.goals.map((g) => ({
      name: g.name,
      current: g.currentCents,
      target: g.targetCents,
      progress: g.progress,
    })),
  };
}
