import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import createMiddleware from "next-intl/middleware";
import { getToken } from "next-auth/jwt";
import { authConfig } from "@/auth.config";
import { routing } from "@/i18n/routing";
import { dashboardPathForMode } from "@/lib/auth-routes";
import { resolveAuthSecret } from "@/lib/auth-secret";

const { auth } = NextAuth(authConfig);
const intlMiddleware = createMiddleware(routing);

const protectedPrefixes = [
  { prefix: "/pedidos", roles: ["CUSTOMER", "DRIVER", "ADMIN"], modes: ["CUSTOMER", "DRIVER"] },
  { prefix: "/pedidos/novo", roles: ["CUSTOMER", "DRIVER", "ADMIN"], modes: ["CUSTOMER"], requireCustomer: true },
  { prefix: "/painel", roles: ["DRIVER", "CUSTOMER", "ADMIN"], modes: ["DRIVER"], requireDriver: true },
  { prefix: "/pedidos-abertos", roles: ["DRIVER", "CUSTOMER", "ADMIN"], modes: ["DRIVER"], requireDriver: true },
  { prefix: "/propostas", roles: ["DRIVER", "CUSTOMER", "ADMIN"], modes: ["DRIVER"], requireDriver: true },
  { prefix: "/veiculo", roles: ["DRIVER", "CUSTOMER", "ADMIN"], modes: ["DRIVER"], requireDriver: true },
  { prefix: "/viagens", roles: ["DRIVER", "CUSTOMER", "ADMIN"], modes: ["DRIVER"], requireDriver: true },
  { prefix: "/onboarding", roles: ["DRIVER", "CUSTOMER", "ADMIN"], modes: ["DRIVER"], requireDriver: true },
  { prefix: "/admin", roles: ["ADMIN"], modes: ["CUSTOMER", "DRIVER"] },
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

function matchRule(path: string) {
  return [...protectedPrefixes]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find((r) => {
      if (path === r.prefix) return true;
      if (r.prefix === "/veiculo") {
        return path.startsWith("/veiculo/") && !path.startsWith("/veiculos");
      }
      return path.startsWith(`${r.prefix}/`) || path === r.prefix;
    });
}

function isHttpsRequest(req: { nextUrl: URL; headers: Headers }): boolean {
  return (
    req.nextUrl.protocol === "https:" ||
    req.headers.get("x-forwarded-proto") === "https"
  );
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const { locale, path } = stripLocale(pathname);
  const loc = locale || routing.defaultLocale;
  const session = req.auth;
  const role = session?.user?.role as string | undefined;
  const activeMode =
    (session?.user as { activeMode?: string } | undefined)?.activeMode ||
    (role === "DRIVER" ? "DRIVER" : "CUSTOMER");
  const hasCustomer =
    Boolean((session?.user as { hasCustomer?: boolean } | undefined)?.hasCustomer) ||
    role === "CUSTOMER" ||
    role === "ADMIN" ||
    role === "DRIVER"; // drivers also receive a customer profile (single account)
  const hasDriver =
    Boolean((session?.user as { hasDriver?: boolean } | undefined)?.hasDriver) ||
    role === "DRIVER";
  const email = session?.user?.email ?? null;
  const cookieNames = req.cookies.getAll().map((c) => c.name);
  const https = isHttpsRequest(req);
  const secret = resolveAuthSecret();

  const tokenInsecure = await getToken({ req, secret, secureCookie: false });
  const tokenSecure = await getToken({ req, secret, secureCookie: true });

  console.info("[mw]", {
    pathname,
    path,
    https,
    hasSession: Boolean(session),
    role: role ?? null,
    activeMode,
    hasCustomer,
    hasDriver,
    email,
    cookieNames,
    getTokenInsecureRole: (tokenInsecure as { role?: string } | null)?.role ?? null,
    getTokenSecureRole: (tokenSecure as { role?: string } | null)?.role ?? null,
  });

  // Block experimental lab routes in production
  if (path.startsWith("/homepage-lab") || path.startsWith("/branding-preview")) {
    return NextResponse.redirect(new URL(`/${loc}`, req.url));
  }

  if (session && authOnlyGuestPaths.has(path)) {
    const dest = dashboardPathForMode(activeMode as "CUSTOMER" | "DRIVER", role);
    const url = new URL(`/${loc}${dest === "/" ? "" : dest}`, req.url);
    return NextResponse.redirect(url);
  }

  const rule = matchRule(path);
  if (rule) {
    if (!session) {
      const login = new URL(`/${loc}/login`, req.url);
      login.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(login);
    }

    if (role === "ADMIN") {
      return intlMiddleware(req);
    }

    if (rule.requireDriver && !hasDriver) {
      return NextResponse.redirect(new URL(`/${loc}/tornar-motorista`, req.url));
    }
    if (rule.requireCustomer && !hasCustomer && !hasDriver) {
      return NextResponse.redirect(new URL(`/${loc}`, req.url));
    }

    if (path === "/pedidos" && activeMode === "DRIVER" && hasDriver) {
      return NextResponse.redirect(new URL(`/${loc}/pedidos-abertos`, req.url));
    }
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
