export function formatMoney(cents: number, currency = "EUR", locale = "pt-PT"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

export function calcPlatformFee(totalCents: number, feePercent: number): number {
  return Math.round((totalCents * feePercent) / 100);
}
