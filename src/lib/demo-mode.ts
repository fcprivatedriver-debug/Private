/**
 * Demo interno da Nina — nunca mistura dados fictícios com contas normais.
 * Ativar só com DEMO_MODE=true + `npm run db:demo` (conta demo@nina.app).
 *
 * Contas de teste REAL (sempre vazias via ensure-test-users):
 * - familia@nina.app
 * - teste@nina.app
 */
export function isDemoMode(): boolean {
  return (
    process.env.DEMO_MODE === "true" ||
    process.env.NEXT_PUBLIC_DEMO_MODE === "true"
  );
}

/** Emails da conta demo (seed completo). Nunca usar em contas reais. */
export const DEMO_EMAILS = ["demo@nina.app", "nina@nina.app"] as const;

/** Contas de testes reais — estrutura vazia, sem movimentos de exemplo. */
export const TEST_EMAIL = "familia@nina.app";
export const TEST_EMAILS = ["familia@nina.app", "teste@nina.app"] as const;

export const DEMO_PASSWORD = "nina123";

export function isDemoEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return (DEMO_EMAILS as readonly string[]).includes(email.toLowerCase());
}

export function isTestEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return (TEST_EMAILS as readonly string[]).includes(email.toLowerCase());
}
