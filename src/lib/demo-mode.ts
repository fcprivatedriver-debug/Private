/**
 * Demo interno da Nina — nunca mistura dados fictícios com contas normais.
 * Ativar só com DEMO_MODE=true (ex.: ambiente de preview / seed).
 */
export function isDemoMode(): boolean {
  return (
    process.env.DEMO_MODE === "true" ||
    process.env.NEXT_PUBLIC_DEMO_MODE === "true"
  );
}

/** Emails da conta demo (seed). Contas normais nunca usam estes dados. */
export const DEMO_EMAILS = ["familia@nina.app", "nina@nina.app"] as const;

export const DEMO_PASSWORD = "nina123";

export function isDemoEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return (DEMO_EMAILS as readonly string[]).includes(email.toLowerCase());
}
