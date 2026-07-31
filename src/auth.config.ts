import type { NextAuthConfig } from "next-auth";
import { resolveAuthSecret } from "@/lib/auth-secret";

/**
 * Edge-safe Auth.js config (no Prisma / no Node adapters).
 * Middleware uses this so `req.auth` decodes the same cookies as Node `auth()`.
 */
export const authConfig = {
  trustHost: true,
  secret: resolveAuthSecret(),
  session: { strategy: "jwt" },
  providers: [],
  pages: {
    signIn: "/pt/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      console.info("[auth.authorized]", {
        pathname: request.nextUrl.pathname,
        hasAuth: Boolean(auth),
        role: (auth?.user as { role?: string } | undefined)?.role ?? null,
        email: auth?.user?.email ?? null,
      });
      return true;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id!;
        const u = user as {
          role?: string;
          hasCustomer?: boolean;
          hasDriver?: boolean;
          activeMode?: string;
        };
        if (u.role) token.role = u.role as never;
        if (typeof u.hasCustomer === "boolean") token.hasCustomer = u.hasCustomer;
        if (typeof u.hasDriver === "boolean") token.hasDriver = u.hasDriver;
        if (u.activeMode) token.activeMode = u.activeMode as never;
      }
      if (trigger === "update" && session) {
        const s = session as {
          activeMode?: string;
          hasCustomer?: boolean;
          hasDriver?: boolean;
          role?: string;
        };
        if (s.activeMode) token.activeMode = s.activeMode as never;
        if (typeof s.hasCustomer === "boolean") token.hasCustomer = s.hasCustomer;
        if (typeof s.hasDriver === "boolean") token.hasDriver = s.hasDriver;
        if (s.role) token.role = s.role as never;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || (token.sub as string);
        if (token.role) {
          (session.user as { role?: string }).role = token.role as string;
        }
        (session.user as { hasCustomer?: boolean }).hasCustomer = Boolean(token.hasCustomer);
        (session.user as { hasDriver?: boolean }).hasDriver = Boolean(token.hasDriver);
        (session.user as { activeMode?: string }).activeMode =
          (token.activeMode as string) || "CUSTOMER";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
