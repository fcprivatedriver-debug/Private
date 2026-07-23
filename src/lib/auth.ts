import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { FamilyRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { authConfig } from "@/auth.config";
import { z } from "zod";

declare module "next-auth" {
  interface User {
    role?: FamilyRole;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role?: FamilyRole;
      image?: string | null;
    };
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

const googleConfigured = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

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
      });
      if (!user?.passwordHash) return null;

      const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!valid) return null;

      const membership = await prisma.familyMember.findFirst({
        where: { userId: user.id },
        select: { role: true },
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: membership?.role,
        image: user.image,
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        if (user.role) token.role = user.role;
        return token;
      }

      if (token.email && !token.role) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
            select: {
              id: true,
              memberships: { select: { role: true }, take: 1 },
            },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.memberships[0]?.role;
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
        session.user.role = token.role as FamilyRole | undefined;
      }
      return session;
    },
  },
});
