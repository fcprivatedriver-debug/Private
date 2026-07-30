/**
 * Resolve Auth.js signing secret.
 * Prefer AUTH_SECRET em produção; há fallback estável para demos.
 */
const DEMO_FALLBACK_SECRET =
  "mel-demo-auth-secret-do-not-use-in-real-prod-32b";

export function resolveAuthSecret(): string {
  const fromEnv = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (fromEnv && fromEnv.trim().length >= 16) {
    return fromEnv.trim();
  }
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[auth] AUTH_SECRET em falta — a usar fallback de demo. Define AUTH_SECRET quando possível.",
    );
  }
  return DEMO_FALLBACK_SECRET;
}
