import { getLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/AppShell";
import { PageGreeting } from "@/components/ui/PageGreeting";
import { DriverUpsertForm } from "@/components/admin/DriverUpsertForm";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";

export default async function AdminMotoristasPage() {
  await requireRole(["ADMIN"]);
  const locale = await getLocale();

  const drivers = await prisma.driverProfile.findMany({
    include: {
      user: { select: { name: true, email: true } },
      vehicles: { where: { active: true }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell locale={locale}>
      <PageGreeting hello="Motoristas" sub="Gerir perfis e veículos da frota FC." />
      <p className="muted" style={{ marginBottom: "1rem" }}>
        <Link href="/admin">← Administração</Link>
      </p>
      <DriverUpsertForm
        drivers={drivers.map((d) => ({
          id: d.id,
          userId: d.userId,
          name: d.user.name,
          email: d.user.email,
          phone: d.phone,
          active: d.active,
          vehicle: d.vehicles[0]
            ? { make: d.vehicles[0].make, model: d.vehicles[0].model, plate: d.vehicles[0].plate }
            : null,
        }))}
      />
    </AppShell>
  );
}
