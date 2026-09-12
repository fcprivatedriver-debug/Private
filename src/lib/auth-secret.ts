/**
 * Resolve Auth.js signing secret.
 *
 * Development: may fall back to a local demo secret so `next dev` works.
 * Production / Vercel production: NEVER fall back — AUTH_SECRET is required.
 */

const LOCAL_DEV_FALLBACK =
  "addynow-local-dev-auth-secret-not-for-production-32";

function isProductionRuntime(): boolean {
  return (
    process.env.VERCEL_ENV === "production" ||
    (process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview")
  );
}

export function resolveAuthSecret(): string {
  const fromEnv = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (fromEnv && fromEnv.trim().length >= 16) {
    return fromEnv.trim();
  }

  if (isProductionRuntime()) {
    throw new Error(
      "[auth] AUTH_SECRET is required in production. Set AUTH_SECRET in the deployment environment variables.",
    );
  }

  if (process.env.NODE_ENV === "production") {
    // Preview builds: still require a real secret if present; otherwise warn loudly.
    console.error(
      "[auth] AUTH_SECRET missing on this deployment. Set AUTH_SECRET in Vercel Environment Variables. Using local-dev fallback only so the preview can boot — NOT safe for real users.",
    );
  }

  return LOCAL_DEV_FALLBACK;
}

/** For /api/health — never expose the secret value. */
export function authSecretSource(): "env" | "missing-production" | "local-dev-fallback" {
  const fromEnv = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (fromEnv && fromEnv.trim().length >= 16) return "env";
  if (isProductionRuntime()) return "missing-production";
  return "local-dev-fallback";
}
