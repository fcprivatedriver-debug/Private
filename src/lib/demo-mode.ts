/**
 * Demo interno — nunca mistura dados fictícios com contas normais.
 *
 * Em produção (VERCEL_ENV=production ou NODE_ENV=production) fica SEMPRE desligado,
 * excepto se ALLOW_DEMO_IN_PRODUCTION=true (emergência / QA controlada).
 *
 * Contas técnicas legadas (@nina.app) mantêm-se por compatibilidade de seed/DB —
 * não são mostradas na UI de produção.
 */

function productionLocked(): boolean {
  if (process.env.ALLOW_DEMO_IN_PRODUCTION === "true") return false;
  return (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  );
}

export function isDemoMode(): boolean {
  if (productionLocked()) return false;
  return (
    process.env.DEMO_MODE === "true" ||
    process.env.NEXT_PUBLIC_DEMO_MODE === "true"
  );
}

/** Emails da conta demo (seed). Legado técnico — não expor em produção. */
export const DEMO_EMAILS = ["demo@nina.app", "nina@nina.app"] as const;

/** Contas de testes reais — estrutura vazia. */
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

/** Mostrar credenciais demo na UI só fora de produção e com demo activo. */
export function showDemoCredentialsInUi(): boolean {
  return isDemoMode();
}
