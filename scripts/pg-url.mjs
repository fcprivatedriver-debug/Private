/**
 * Helpers for Neon/Prisma URLs used by the Vercel build.
 * Never log the raw URL — it contains credentials.
 */

const CONNECT_TIMEOUT_SECONDS = 30;

export function redactDbHost(url) {
  if (!url) return "(vazio)";
  try {
    const u = new URL(url);
    if (!u.hostname) return "(URL inválido)";
    const port = u.port || "5432";
    return `${u.hostname}:${port}`;
  } catch {
    return "(URL inválido)";
  }
}

function appendTimeoutRaw(url, seconds) {
  if (/[?&]connect_timeout=\d+/.test(url)) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}connect_timeout=${seconds}`;
}

/**
 * Neon cold start exceeds Prisma's default 5s and surfaces as P1001.
 * Raise connect_timeout without rewriting the host if parsing looks unsafe.
 */
export function withConnectTimeout(url, seconds = CONNECT_TIMEOUT_SECONDS) {
  if (!url) return url;
  try {
    const u = new URL(url);
    const originalHost = u.hostname;
    const current = Number(u.searchParams.get("connect_timeout"));
    if (!Number.isFinite(current) || current < seconds) {
      u.searchParams.set("connect_timeout", String(seconds));
    }
    const next = u.toString();
    if (new URL(next).hostname !== originalHost) return appendTimeoutRaw(url, seconds);
    return next;
  } catch {
    return appendTimeoutRaw(url, seconds);
  }
}

/**
 * Prisma 6.6+ `db execute` does not load prisma/schema.prisma by itself.
 * `--url` and `--schema` are mutually exclusive; pass only `--url`.
 */
export function prismaDbExecuteArgs(url) {
  if (!url || typeof url !== "string") {
    throw new Error("prisma db execute precisa de DIRECT_URL ou DATABASE_URL");
  }
  return ["db", "execute", "--url", url, "--stdin"];
}
