import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedPrefixes = [
  { prefix: "/pedidos", roles: ["CUSTOMER", "DRIVER", "ADMIN"] },
  { prefix: "/pedidos/novo", roles: ["CUSTOMER"] },
  { prefix: "/painel", roles: ["DRIVER"] },
  { prefix: "/pedidos-abertos", roles: ["DRIVER"] },
  { prefix: "/propostas", roles: ["DRIVER"] },
  { prefix: "/veiculo", roles: ["DRIVER"] },
  { prefix: "/admin", roles: ["ADMIN"] },
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const rule = [...protectedPrefixes]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));

  if (!rule) return NextResponse.next();

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  if (!token) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  const role = token.role as string | undefined;
  if (!role || !rule.roles.includes(role)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Customers own /pedidos list & new; drivers can open /pedidos/[id]
  if (pathname === "/pedidos" && role === "DRIVER") {
    return NextResponse.redirect(new URL("/pedidos-abertos", request.url));
  }
  if (pathname.startsWith("/pedidos/novo") && role !== "CUSTOMER") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/pedidos/:path*",
    "/painel/:path*",
    "/pedidos-abertos/:path*",
    "/propostas/:path*",
    "/veiculo/:path*",
    "/admin/:path*",
  ],
};
