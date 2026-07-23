/**
 * Resolve Auth.js signing secret.
 *
 * On Vercel, AUTH_SECRET is recommended. For phone-only / demo deploys where
 * the Environment Variables UI is hard to reach, we fall back to a stable
 * demo secret so Auth.js does not show the Configuration error page.
 *
 * Prefer setting AUTH_SECRET in Vercel when you can.
 */
const DEMO_FALLBACK_SECRET =
  "mafil-demo-auth-secret-do-not-use-in-real-prod-32b";

export function resolveAuthSecret(): string {
  const fromEnv = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (fromEnv && fromEnv.trim().length >= 16) {
    return fromEnv.trim();
  }
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[auth] AUTH_SECRET missing — using built-in demo fallback. Set AUTH_SECRET in Vercel when possible.",
    );
  }
  return DEMO_FALLBACK_SECRET;
}
