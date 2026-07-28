import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/layout/AppShell";
import { ToastHost } from "@/components/mel/ToastHost";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireUser();
  return (
    <AppShell userName={user.name}>
      <ToastHost />
      {children}
    </AppShell>
  );
}
