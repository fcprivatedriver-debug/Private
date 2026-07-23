import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { getToken } from "next-auth/jwt";
import { routing } from "@/i18n/routing";
import { resolveAuthSecret } from "@/lib/auth-secret";

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

function stripLocale(pathname: string): { locale: string | null; path: string } {
  const parts = pathname.split("/");
  const maybeLocale = parts[1];
  if (routing.locales.includes(maybeLocale as "pt" | "en")) {
    const rest = "/" + parts.slice(2).join("/");
    return { locale: maybeLocale, path: rest === "/" ? "/" : rest.replace(/\/$/, "") || "/" };
  }
  return { locale: null, path: pathname };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const { locale, path } = stripLocale(pathname);

  const rule = [...protectedPrefixes]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find((r) => {
      if (path === r.prefix) return true;
      // Avoid /veiculo matching public /veiculos/[id] profiles
      if (r.prefix === "/veiculo") {
        return path.startsWith("/veiculo/") && !path.startsWith("/veiculos");
      }
      return path.startsWith(`${r.prefix}/`);
    });

  if (rule) {
    const secret = resolveAuthSecret();

    const token = await getToken({
      req: request,
      secret,
    });

    const loc = locale || routing.defaultLocale;

    if (!token) {
      const login = new URL(`/${loc}/login`, request.url);
      login.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(login);
    }

    const role = token.role as string | undefined;
    if (!role || !rule.roles.includes(role)) {
      return NextResponse.redirect(new URL(`/${loc}`, request.url));
    }

    if (path === "/pedidos" && role === "DRIVER") {
      return NextResponse.redirect(new URL(`/${loc}/pedidos-abertos`, request.url));
    }
    if (path.startsWith("/pedidos/novo") && role !== "CUSTOMER") {
      return NextResponse.redirect(new URL(`/${loc}`, request.url));
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
