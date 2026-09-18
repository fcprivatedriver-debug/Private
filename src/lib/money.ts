import { PLATFORM_COMMISSION_PERCENT } from "@/config/constants";

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

/**
 * Platform commission in minor units (integer cents).
 * Uses integer arithmetic to avoid floating-point errors.
 * Example: 200_00 cents @ 5% → 10_00 commission, 190_00 driver.
 */
export function calcPlatformFee(
  totalCents: number,
  feePercent: number = PLATFORM_COMMISSION_PERCENT,
): number {
  if (!Number.isFinite(totalCents) || totalCents < 0) return 0;
  if (!Number.isFinite(feePercent) || feePercent <= 0) return 0;
  return Math.round((totalCents * feePercent) / 100);
}

/** Driver net after platform commission (minor units). */
export function calcDriverNet(
  totalCents: number,
  feePercent: number = PLATFORM_COMMISSION_PERCENT,
): number {
  return Math.max(0, totalCents - calcPlatformFee(totalCents, feePercent));
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
