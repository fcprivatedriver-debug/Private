import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  return session;
}

export async function requireRole(roles: Role[]) {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) {
    redirect(dashboardPathForRole(session.user.role));
  }
  return session;
}

export function dashboardPathForRole(role: Role) {
  switch (role) {
    case "ADMIN":
      return "/pt/admin";
    default:
      return "/pt/cliente";
  }
}

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      customerProfile: { include: { travelHabits: true } },
      driverProfile: { include: { vehicles: true } },
    },
  });
}

export async function getSiteSettings() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  if (settings) return settings;
  return prisma.siteSettings.create({ data: { id: "default" } });
}
