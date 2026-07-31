import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import createMiddleware from "next-intl/middleware";
import { authConfig } from "@/auth.config";
import { routing } from "@/i18n/routing";
import { dashboardPathForRole } from "@/lib/auth-routes";

const { auth } = NextAuth(authConfig);
const intlMiddleware = createMiddleware(routing);

const protectedPrefixes = [
  { prefix: "/cliente", roles: ["CUSTOMER", "ADMIN"] },
  { prefix: "/perfil", roles: ["CUSTOMER", "ADMIN"] },
  { prefix: "/habitos", roles: ["CUSTOMER", "ADMIN"] },
  { prefix: "/minutos", roles: ["CUSTOMER", "ADMIN"] },
  { prefix: "/faturas", roles: ["CUSTOMER", "ADMIN"] },
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
    .find((r) => path === r.prefix || path.startsWith(`${r.prefix}/`));
  return rule?.roles ?? null;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const { locale, path } = stripLocale(pathname);
  const loc = locale || routing.defaultLocale;
  const session = req.auth;
  const role = session?.user?.role as string | undefined;

  const requiredRoles = rolesForPath(path);
  if (requiredRoles) {
    if (!session?.user) {
      const url = req.nextUrl.clone();
      url.pathname = `/${loc}/login`;
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    if (!requiredRoles.includes(role || "")) {
      const url = req.nextUrl.clone();
      url.pathname = `/${loc}${dashboardPathForRole(role || "CUSTOMER")}`;
      return NextResponse.redirect(url);
    }
  }

  if (session?.user && authOnlyGuestPaths.has(path)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${loc}${dashboardPathForRole(role || "CUSTOMER")}`;
    return NextResponse.redirect(url);
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
