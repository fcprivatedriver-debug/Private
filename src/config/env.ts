export function env(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const isDemoMode = () =>
  process.env.DEMO_MODE === "true" || process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const paymentsEnabled = () => process.env.PAYMENTS_ENABLED === "true";

export const stripeConfigured = () =>
  Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
