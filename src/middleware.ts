import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import createMiddleware from "next-intl/middleware";
import { getToken } from "next-auth/jwt";
import { authConfig } from "@/auth.config";
import { routing } from "@/i18n/routing";
import { dashboardPathForRole } from "@/lib/auth-routes";
import { resolveAuthSecret } from "@/lib/auth-secret";

const { auth } = NextAuth(authConfig);
const intlMiddleware = createMiddleware(routing);

const protectedPrefixes = [
  { prefix: "/pedidos", roles: ["CUSTOMER", "DRIVER", "ADMIN"] },
  { prefix: "/pedidos/novo", roles: ["CUSTOMER"] },
  { prefix: "/painel", roles: ["DRIVER"] },
  { prefix: "/pedidos-abertos", roles: ["DRIVER"] },
  { prefix: "/propostas", roles: ["DRIVER"] },
  { prefix: "/veiculo", roles: ["DRIVER"] },
  { prefix: "/viagens", roles: ["DRIVER"] },
  { prefix: "/onboarding", roles: ["DRIVER"] },
  { prefix: "/admin", roles: ["ADMIN"] },
];

const authOnlyGuestPaths = new Set(["/login", "/registo"]);

function stripLocale(pathname: string): { locale: string | null; path: string } {
  const parts = pathname.split("/");
  const maybeLocale = parts[1];
  if (routing.locales.includes(maybeLocale as "pt" | "en")) {
    const rest = "/" + parts.slice(2).join("/");
    return { locale: maybeLocale, path: rest === "/" ? "/" : rest.replace(/\/$/, "") || "/" };
  }
  return { locale: null, path: pathname };
}

function rolesForPath(path: string): string[] | null {
  const rule = [...protectedPrefixes]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find((r) => {
      if (path === r.prefix) return true;
      if (r.prefix === "/veiculo") {
        return path.startsWith("/veiculo/") && !path.startsWith("/veiculos");
      }
      return path.startsWith(`${r.prefix}/`);
    });
  return rule?.roles ?? null;
}

function isHttpsRequest(req: { nextUrl: URL; headers: Headers }): boolean {
  return (
    req.nextUrl.protocol === "https:" ||
    req.headers.get("x-forwarded-proto") === "https"
  );
}

/**
 * Root cause (production): session cookie is `__Secure-authjs.session-token`.
 * Raw `getToken({ req, secret })` without `secureCookie: true` returns null on HTTPS,
 * while Node `auth()` still sees the session — header shows the name, middleware
 * treats the user as logged out and redirects to login.
 *
 * Fix: Auth.js `auth()` wrapper (correct cookie decode) + diagnostic getToken compare.
 */
export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const { locale, path } = stripLocale(pathname);
  const loc = locale || routing.defaultLocale;
  const session = req.auth;
  const role = session?.user?.role as string | undefined;
  const email = session?.user?.email ?? null;
  const cookieNames = req.cookies.getAll().map((c) => c.name);
  const https = isHttpsRequest(req);
  const secret = resolveAuthSecret();

  // Temporary diagnostics: compare broken vs correct getToken modes
  const tokenInsecure = await getToken({ req, secret, secureCookie: false });
  const tokenSecure = await getToken({ req, secret, secureCookie: true });

  console.info("[mw]", {
    pathname,
    path,
    https,
    hasSession: Boolean(session),
    role: role ?? null,
    email,
    cookieNames,
    getTokenInsecureRole: (tokenInsecure as { role?: string } | null)?.role ?? null,
    getTokenSecureRole: (tokenSecure as { role?: string } | null)?.role ?? null,
    rootCauseWouldMissSession:
      Boolean(session) && !tokenInsecure && Boolean(tokenSecure || session),
  });

  if (session && authOnlyGuestPaths.has(path)) {
    const dest = dashboardPathForRole(role);
    const url = new URL(`/${loc}${dest === "/" ? "" : dest}`, req.url);
    console.info("[mw] redirect", {
      reason: "authenticated-on-guest-page",
      from: pathname,
      to: url.pathname,
      role: role ?? null,
    });
    return NextResponse.redirect(url);
  }

  const allowedRoles = rolesForPath(path);
  if (allowedRoles) {
    if (!session) {
      const login = new URL(`/${loc}/login`, req.url);
      login.searchParams.set("callbackUrl", pathname);
      console.info("[mw] redirect", {
        reason: "no-session-on-protected-route",
        from: pathname,
        to: login.pathname + login.search,
        allowedRoles,
        note:
          tokenSecure && !tokenInsecure
            ? "LEGACY_BUG: insecure getToken would also miss; auth() should have session — investigate secret"
            : undefined,
      });
      return NextResponse.redirect(login);
    }

    if (!role || !allowedRoles.includes(role)) {
      const home = new URL(`/${loc}`, req.url);
      console.info("[mw] redirect", {
        reason: "role-not-allowed",
        from: pathname,
        to: home.pathname,
        role: role ?? null,
        allowedRoles,
      });
      return NextResponse.redirect(home);
    }

    if (path === "/pedidos" && role === "DRIVER") {
      const url = new URL(`/${loc}/pedidos-abertos`, req.url);
      console.info("[mw] redirect", {
        reason: "driver-pedidos-alias",
        from: pathname,
        to: url.pathname,
        role,
      });
      return NextResponse.redirect(url);
    }
    if (path.startsWith("/pedidos/novo") && role !== "CUSTOMER") {
      const home = new URL(`/${loc}`, req.url);
      console.info("[mw] redirect", {
        reason: "non-customer-new-trip",
        from: pathname,
        to: home.pathname,
        role,
      });
      return NextResponse.redirect(home);
    }
  }

  console.info("[mw] pass", { pathname, path, role: role ?? null, hasSession: Boolean(session) });
  return intlMiddleware(req);
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
