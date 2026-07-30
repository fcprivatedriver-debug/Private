import type { NextAuthConfig } from "next-auth";
import { resolveAuthSecret } from "@/lib/auth-secret";

/**
 * Config Auth.js segura para Edge (sem Prisma).
 * A protecção de rotas vive no middleware.
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
    authorized() {
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        const bio = (user as { biometricsEnabled?: boolean }).biometricsEnabled;
        if (typeof bio === "boolean") token.biometricsEnabled = bio;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || (token.sub as string);
        (session.user as { biometricsEnabled?: boolean }).biometricsEnabled =
          Boolean(token.biometricsEnabled);
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
