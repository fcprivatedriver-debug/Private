import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

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
    const locale = await getLocale().catch(() => "pt");
    redirect(`/${locale}`);
  }
  return session;
}

export async function getOptionalSession() {
  return auth();
}
