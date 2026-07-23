import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/db";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");

  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const unread = await prisma.alert.count({
    where: { familyId: membership.familyId, isRead: false },
  });

  return (
    <AppShell userName={session.user.name || membership.displayName} unreadAlerts={unread}>
      {children}
    </AppShell>
  );
}
