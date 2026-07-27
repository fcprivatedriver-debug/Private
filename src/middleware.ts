import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import createMiddleware from "next-intl/middleware";
import { authConfig } from "@/auth.config";
import { routing } from "@/i18n/routing";
import { APP_HOME } from "@/lib/auth-routes";

const { auth } = NextAuth(authConfig);
const intlMiddleware = createMiddleware(routing);

const protectedPrefixes = [
  "/hoje",
  "/tarefas",
  "/calendario",
  "/captura",
  "/relatorios",
  "/habitos",
  "/lembretes",
  "/definicoes",
  "/perfil",
];

const authOnlyGuestPaths = new Set(["/login", "/registo"]);

function stripLocale(pathname: string): { locale: string | null; path: string } {
  const parts = pathname.split("/");
  const maybeLocale = parts[1];
  if (routing.locales.includes(maybeLocale as "pt" | "en")) {
    const rest = "/" + parts.slice(2).join("/");
    return {
      locale: maybeLocale,
      path: rest === "/" ? "/" : rest.replace(/\/$/, "") || "/",
    };
  }
  return { locale: null, path: pathname };
}

function isProtected(path: string): boolean {
  return protectedPrefixes.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const { locale, path } = stripLocale(pathname);
  const loc = locale || routing.defaultLocale;
  const session = req.auth;

  if (session && authOnlyGuestPaths.has(path)) {
    return NextResponse.redirect(new URL(`/${loc}${APP_HOME}`, req.url));
  }

  if (isProtected(path) && !session) {
    const login = new URL(`/${loc}/login`, req.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
