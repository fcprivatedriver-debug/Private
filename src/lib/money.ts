const LOCALE_BY_LANG: Record<string, string> = {
  pt: "pt-PT",
  en: "en-GB",
};

/** Convert major units (e.g. euros) to integer minor units (cents). */
export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

/** @deprecated use toMinorUnits — kept for existing call sites during Phase 0 */
export function eurosToCents(euros: number): number {
  return toMinorUnits(euros);
}

export function formatMoney(
  cents: number,
  currency = "EUR",
  localeOrLang = "pt",
): string {
  const locale = LOCALE_BY_LANG[localeOrLang] ?? localeOrLang;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function calcPlatformFee(totalCents: number, feePercent: number): number {
  return Math.round((totalCents * feePercent) / 100);
}

/** Validate ISO-4217-ish currency codes we accept (extensible). */
export function assertSupportedCurrency(
  currency: string,
  supported: string[],
): void {
  if (!supported.includes(currency)) {
    throw new Error(`Currency ${currency} is not enabled`);
  }
}
