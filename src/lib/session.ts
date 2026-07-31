import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    const locale = await getLocale().catch(() => "pt");
    redirect(`/${locale}/login`);
  }
  return session;
}

export async function requireRole(...roles: Role[]) {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) {
    // Dual-account: CUSTOMER with driverProfile can access DRIVER surfaces
    if (roles.includes("DRIVER") && (session.user.hasDriver || session.user.role === "DRIVER")) {
      return session;
    }
    if (roles.includes("CUSTOMER") && (session.user.hasCustomer || session.user.role === "CUSTOMER")) {
      return session;
    }
    const locale = await getLocale().catch(() => "pt");
    redirect(`/${locale}`);
  }
  return session;
}

/** Ensure the signed-in user has a driver profile (create path is /tornar-motorista). */
export async function requireDriverAccess() {
  const session = await requireSession();
  if (session.user.role === "ADMIN") return session;
  if (session.user.hasDriver || session.user.role === "DRIVER") {
    const profile = await prisma.driverProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (profile) return session;
  }
  const locale = await getLocale().catch(() => "pt");
  redirect(`/${locale}/tornar-motorista`);
}

export async function getOptionalSession() {
  return auth();
}
