import { getLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/AppShell";
import { PageGreeting } from "@/components/ui/PageGreeting";
import { PlanEditor, PackageEditor } from "@/components/admin/PlanEditors";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";

export default async function AdminPlanosPage() {
  await requireRole(["ADMIN"]);
  const locale = await getLocale();

  const [plans, packages] = await Promise.all([
    prisma.plan.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.extraMinutePackage.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <AppShell locale={locale}>
      <PageGreeting hello="Planos e pacotes" sub="Gerir ofertas de subscrição e minutos adicionais." />
      <p className="muted" style={{ marginBottom: "1rem" }}>
        <Link href="/admin">← Administração</Link>
      </p>
      <PlanEditor plans={plans} />
      <PackageEditor packages={packages} />
    </AppShell>
  );
}
