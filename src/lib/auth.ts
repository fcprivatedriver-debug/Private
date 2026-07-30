import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { authConfig } from "@/auth.config";
import { z } from "zod";

declare module "next-auth" {
  interface User {
    biometricsEnabled?: boolean;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      biometricsEnabled?: boolean;
    };
  }
  interface JWT {
    id?: string;
    biometricsEnabled?: boolean;
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
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

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        biometricsEnabled: user.biometricsEnabled,
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
        token.biometricsEnabled = Boolean(
          (user as { biometricsEnabled?: boolean }).biometricsEnabled,
        );
        return token;
      }

      if (trigger === "update" && session && typeof session === "object") {
        const bio = (session as { biometricsEnabled?: boolean }).biometricsEnabled;
        if (typeof bio === "boolean") token.biometricsEnabled = bio;
      }

      if (token.email && token.biometricsEnabled === undefined) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
            select: { id: true, biometricsEnabled: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.biometricsEnabled = dbUser.biometricsEnabled;
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
        session.user.biometricsEnabled = Boolean(token.biometricsEnabled);
      }
      return session;
    },
  },
});
