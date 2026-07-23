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
    /**
     * Always allow through here — route protection + redirects live in middleware.ts
     * so we can log the exact reason for every redirect.
     */
    authorized({ auth, request }) {
      console.info("[auth.authorized]", {
        pathname: request.nextUrl.pathname,
        hasAuth: Boolean(auth),
        role: (auth?.user as { role?: string } | undefined)?.role ?? null,
        email: auth?.user?.email ?? null,
      });
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        const role = (user as { role?: string }).role;
        if (role) token.role = role as never;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || (token.sub as string);
        if (token.role) {
          (session.user as { role?: string }).role = token.role as string;
        }
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
