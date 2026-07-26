import { percent, type MoneyCents } from "@/lib/money";

export type DashboardTotals = {
  incomeCents: MoneyCents;
  expenseCents: MoneyCents;
  balanceCents: MoneyCents;
  savedCents: MoneyCents;
  budgetLimitCents: MoneyCents;
  budgetUsedCents: MoneyCents;
  budgetUsedPercent: number;
};

export function computeDashboardTotals(input: {
  incomeCents: number;
  expenseCents: number;
  budgetLimitCents: number;
}): DashboardTotals {
  const balanceCents = input.incomeCents - input.expenseCents;
  const savedCents = Math.max(0, balanceCents);
  const budgetUsedPercent = percent(input.expenseCents, input.budgetLimitCents || input.incomeCents || 1);

  return {
    incomeCents: input.incomeCents,
    expenseCents: input.expenseCents,
    balanceCents,
    savedCents,
    budgetLimitCents: input.budgetLimitCents,
    budgetUsedCents: input.expenseCents,
    budgetUsedPercent,
  };
}

export function budgetAlertLevel(usedPercent: number): 75 | 90 | 100 | null {
  if (usedPercent >= 100) return 100;
  if (usedPercent >= 90) return 90;
  if (usedPercent >= 75) return 75;
  return null;
}

export function goalProgress(currentCents: number, targetCents: number): number {
  if (targetCents <= 0) return 0;
  return Math.min(100, Math.round((currentCents / targetCents) * 1000) / 10);
}

export type CategorySlice = { name: string; color: string; cents: number };

export function groupByCategory(
  rows: { categoryName: string; color: string; amountCents: number }[],
): CategorySlice[] {
  const map = new Map<string, CategorySlice>();
  for (const row of rows) {
    const prev = map.get(row.categoryName);
    if (prev) prev.cents += row.amountCents;
    else map.set(row.categoryName, { name: row.categoryName, color: row.color, cents: row.amountCents });
  }
  return [...map.values()].sort((a, b) => b.cents - a.cents);
}

export type MonthPoint = { label: string; income: number; expense: number };

export function buildMonthlyEvolution(
  months: { label: string; incomeCents: number; expenseCents: number }[],
): MonthPoint[] {
  return months.map((m) => ({
    label: m.label,
    income: m.incomeCents / 100,
    expense: m.expenseCents / 100,
  }));
}
