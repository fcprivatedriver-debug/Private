export type MoneyCents = number;

export function eurosToCents(value: number): MoneyCents {
  return Math.round(value * 100);
}

export function centsToEuros(cents: MoneyCents): number {
  return cents / 100;
}

/** Formatação EUR pt-PT */
export function formatEUR(cents: MoneyCents, opts?: { signed?: boolean }): string {
  const value = centsToEuros(cents);
  const formatted = new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(Math.abs(value));

  if (!opts?.signed) return formatted;
  if (cents > 0) return `+${formatted}`;
  if (cents < 0) return `−${formatted}`;
  return formatted;
}

export function parseEURInput(raw: string): MoneyCents | null {
  const cleaned = raw
    .trim()
    .replace(/\s/g, "")
    .replace(/€/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return eurosToCents(n);
}

export function percent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(999, Math.round((part / total) * 1000) / 10);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function monthBounds(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { start, end };
}

export function currentYearMonth(now = new Date()): { year: number; month: number } {
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function monthLabel(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" }).format(d);
}
