import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import createMiddleware from "next-intl/middleware";
import { authConfig } from "@/auth.config";
import { routing } from "@/i18n/routing";
import { dashboardPathForRole } from "@/lib/auth-routes";

const { auth } = NextAuth(authConfig);
const intlMiddleware = createMiddleware(routing);

const protectedPrefixes = [
  { prefix: "/pedidos/novo", roles: ["CUSTOMER"] },
  { prefix: "/pedidos", roles: ["CUSTOMER", "DRIVER", "ADMIN"] },
  { prefix: "/painel", roles: ["DRIVER"] },
  { prefix: "/pedidos-abertos", roles: ["DRIVER"] },
  { prefix: "/propostas", roles: ["DRIVER"] },
  { prefix: "/veiculo", roles: ["DRIVER"] },
  { prefix: "/viagens", roles: ["DRIVER"] },
  { prefix: "/onboarding", roles: ["DRIVER"] },
  { prefix: "/admin", roles: ["ADMIN"] },
];

/** Guest-only auth screens — authenticated users are sent to their dashboard. */
const authOnlyGuestPaths = new Set(["/login", "/registo"]);

/** Public paths that never require a session. */
const publicExactPaths = new Set([
  "/login",
  "/registo",
  "/verificar-email",
  "/termos",
  "/privacidade",
]);

/** Retired prototype / marketing routes → home (which then routes by auth). */
const retiredPrefixes = [
  "/demo-e2e",
  "/demo",
  "/homepage-lab",
  "/branding-preview",
  "/como-funciona",
  "/para-motoristas",
];

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

function isRetiredPath(path: string) {
  return retiredPrefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

function localeUrl(loc: string, path: string, reqUrl: string) {
  const normalized = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return new URL(`/${loc}${normalized}`, reqUrl);
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const { locale, path } = stripLocale(pathname);
  const loc = locale || routing.defaultLocale;
  const session = req.auth;
  const role = session?.user?.role as string | undefined;

  // Retired prototype / marketing URLs → app entry
  if (isRetiredPath(path)) {
    return NextResponse.redirect(localeUrl(loc, "/", req.url));
  }

  // Home: production SaaS entry — login or role dashboard
  if (path === "/" || path === "") {
    if (session?.user) {
      const dest = dashboardPathForRole(role);
      return NextResponse.redirect(localeUrl(loc, dest, req.url));
    }
    return NextResponse.redirect(localeUrl(loc, "/login", req.url));
  }

  if (session && authOnlyGuestPaths.has(path)) {
    const dest = dashboardPathForRole(role);
    return NextResponse.redirect(localeUrl(loc, dest, req.url));
  }

  if (publicExactPaths.has(path) || path.startsWith("/verificar-email")) {
    return intlMiddleware(req);
  }

  // Public profile pages stay reachable (offer / booking context)
  if (path.startsWith("/motoristas/") || path.startsWith("/veiculos/")) {
    return intlMiddleware(req);
  }

  const allowedRoles = rolesForPath(path);
  if (allowedRoles) {
    if (!session) {
      const login = localeUrl(loc, "/login", req.url);
      login.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(login);
    }

    if (!role || !allowedRoles.includes(role)) {
      return NextResponse.redirect(localeUrl(loc, dashboardPathForRole(role), req.url));
    }

    if (path === "/pedidos" && role === "DRIVER") {
      return NextResponse.redirect(localeUrl(loc, "/pedidos-abertos", req.url));
    }
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
