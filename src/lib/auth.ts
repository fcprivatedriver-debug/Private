import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { authConfig } from "@/auth.config";
import { resolveActiveMode, type AccountMode } from "@/lib/account-mode";
import { z } from "zod";

declare module "next-auth" {
  interface User {
    role: Role;
    hasCustomer?: boolean;
    hasDriver?: boolean;
    activeMode?: AccountMode;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      image?: string | null;
      hasCustomer: boolean;
      hasDriver: boolean;
      activeMode: AccountMode;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    hasCustomer?: boolean;
    hasDriver?: boolean;
    activeMode?: AccountMode;
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const googleConfigured = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

async function loadCapabilities(userId: string, role: Role) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      customerProfile: { select: { id: true } },
      driverProfile: { select: { id: true } },
    },
  });
  const hasCustomer =
    Boolean(user?.customerProfile) ||
    user?.role === "CUSTOMER" ||
    user?.role === "ADMIN" ||
    role === "CUSTOMER" ||
    role === "ADMIN";
  const hasDriver =
    Boolean(user?.driverProfile) || user?.role === "DRIVER" || role === "DRIVER";
  return { hasCustomer, hasDriver, role: (user?.role ?? role) as Role };
}

const providers = [
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) return null;

      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email.toLowerCase() },
        include: {
          customerProfile: { select: { id: true } },
          driverProfile: { select: { id: true } },
        },
      });
      if (!user?.passwordHash) return null;

      const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!valid) return null;

      const hasCustomer =
        Boolean(user.customerProfile) ||
        user.role === "CUSTOMER" ||
        user.role === "ADMIN";
      const hasDriver = Boolean(user.driverProfile) || user.role === "DRIVER";
      const activeMode = resolveActiveMode({
        role: user.role,
        hasCustomer,
        hasDriver,
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        image: user.image,
        hasCustomer,
        hasDriver,
        activeMode,
      };
    },
  }),
];

if (googleConfigured) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }) as never,
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  ...(googleConfigured ? { adapter: PrismaAdapter(prisma) } : {}),
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.hasCustomer = Boolean(user.hasCustomer);
        token.hasDriver = Boolean(user.hasDriver);
        token.activeMode = user.activeMode ?? resolveActiveMode({
          role: user.role,
          hasCustomer: Boolean(user.hasCustomer),
          hasDriver: Boolean(user.hasDriver),
        });
        return token;
      }

      if (trigger === "update" && session) {
        const next = session as {
          activeMode?: AccountMode;
          hasCustomer?: boolean;
          hasDriver?: boolean;
          role?: Role;
        };
        if (next.activeMode) token.activeMode = next.activeMode;
        if (typeof next.hasCustomer === "boolean") token.hasCustomer = next.hasCustomer;
        if (typeof next.hasDriver === "boolean") token.hasDriver = next.hasDriver;
        if (next.role) token.role = next.role;
      }

      if (token.id && (token.hasCustomer == null || token.hasDriver == null)) {
        try {
          const caps = await loadCapabilities(String(token.id), token.role as Role);
          token.hasCustomer = caps.hasCustomer;
          token.hasDriver = caps.hasDriver;
          token.role = caps.role;
          token.activeMode = resolveActiveMode({
            role: caps.role,
            hasCustomer: caps.hasCustomer,
            hasDriver: caps.hasDriver,
            preferred: token.activeMode,
          });
        } catch (err) {
          console.error("[auth] capability load failed", err);
        }
      }

      if (token.email && !token.role) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
            select: { id: true, role: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
          }
        } catch (err) {
          console.error("[auth] jwt backfill failed", err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || (token.sub as string);
        session.user.role = token.role as Role;
        session.user.hasCustomer = Boolean(token.hasCustomer);
        session.user.hasDriver = Boolean(token.hasDriver);
        session.user.activeMode = (token.activeMode as AccountMode) || "CUSTOMER";
      }
      return session;
    },
  },
});
