/** Default platform commission: 15% (1500 basis points) */
export const DEFAULT_COMMISSION_RATE_BPS = 1500;

export const commissionConfig = {
  defaultRateBps: DEFAULT_COMMISSION_RATE_BPS,
  currency: "EUR" as const,
  /** Minimum commission in cents */
  minimumCommissionCents: 0,
};
