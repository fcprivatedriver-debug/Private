/**
 * Demo interno da Nina — nunca mistura dados fictícios com contas normais.
 * Ativar só com DEMO_MODE=true + `npm run db:demo` (conta demo@nina.app).
 *
 * familia@nina.app é conta de TESTE REAL e deve permanecer vazia.
 */
export function isDemoMode(): boolean {
  return (
    process.env.DEMO_MODE === "true" ||
    process.env.NEXT_PUBLIC_DEMO_MODE === "true"
  );
}

/** Emails da conta demo (seed completo). Nunca usar em contas reais. */
export const DEMO_EMAILS = ["demo@nina.app", "nina@nina.app"] as const;

/** Conta de testes reais — estrutura vazia, sem movimentos de exemplo. */
export const TEST_EMAIL = "familia@nina.app";

export const DEMO_PASSWORD = "nina123";

export function isDemoEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return (DEMO_EMAILS as readonly string[]).includes(email.toLowerCase());
}
