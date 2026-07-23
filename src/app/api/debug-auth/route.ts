import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveAuthSecret } from "@/lib/auth-secret";
import { getToken } from "next-auth/jwt";
import { cookies, headers } from "next/headers";

/**
 * Temporary production diagnostics for auth/middleware cookie mismatch.
 * GET /api/debug-auth
 */
export async function GET() {
  const session = await auth();
  const jar = await cookies();
  const cookieNames = jar.getAll().map((c) => c.name);
  const h = await headers();
  const secret = resolveAuthSecret();
  const secureName = "__Secure-authjs.session-token";
  const plainName = "authjs.session-token";

  const fakeReq = {
    headers: Object.fromEntries(h.entries()),
    cookies: Object.fromEntries(jar.getAll().map((c) => [c.name, c.value])),
  } as never;

  const tokenDefault = await getToken({ req: fakeReq, secret });
  const tokenInsecure = await getToken({ req: fakeReq, secret, secureCookie: false });
  const tokenSecure = await getToken({
    req: fakeReq,
    secret,
    secureCookie: true,
  });

  const diagnosis =
    session && !tokenInsecure && (tokenSecure || cookieNames.some((n) => n.startsWith(secureName)))
      ? "ROOT_CAUSE_CONFIRMED: getToken(secureCookie:false) misses __Secure-authjs.session-token; Node auth() sees session"
      : session && tokenDefault
        ? "getToken_default_works"
        : !session
          ? "no-session"
          : "check-manually";

  return NextResponse.json({
    sessionUser: session?.user
      ? { email: session.user.email, role: session.user.role, name: session.user.name }
      : null,
    cookieNames,
    hasSecureSessionCookie: cookieNames.some((n) => n === secureName || n.startsWith(`${secureName}.`)),
    hasPlainSessionCookie: cookieNames.some((n) => n === plainName || n.startsWith(`${plainName}.`)),
    getTokenDefaultRole: (tokenDefault as { role?: string } | null)?.role ?? null,
    getTokenInsecureRole: (tokenInsecure as { role?: string } | null)?.role ?? null,
    getTokenSecureRole: (tokenSecure as { role?: string } | null)?.role ?? null,
    diagnosis,
  });
}
