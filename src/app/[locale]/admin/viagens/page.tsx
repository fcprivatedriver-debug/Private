import { getLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/AppShell";
import { PageGreeting } from "@/components/ui/PageGreeting";
import { EmptyState } from "@/components/ui/EmptyState";
import { AdminTripRow } from "@/components/admin/AdminTripRow";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";

export default async function AdminViagensPage() {
  await requireRole(["ADMIN"]);
  const locale = await getLocale();

  const [trips, drivers] = await Promise.all([
    prisma.trip.findMany({
      orderBy: { scheduledAt: "desc" },
      take: 40,
      include: { customer: { select: { name: true } } },
    }),
    prisma.driverProfile.findMany({
      where: { active: true },
      include: { user: { select: { name: true } } },
    }),
  ]);

  const driverOptions = drivers.map((d) => ({ id: d.id, name: d.user.name }));

  return (
    <AppShell locale={locale}>
      <PageGreeting hello="Viagens" sub="Confirmar pedidos, atribuir motoristas ou recusar." />
      <p className="muted" style={{ marginBottom: "1rem" }}>
        <Link href="/admin">← Administração</Link>
      </p>

      <div className="list-stack">
        {trips.map((t) => (
          <AdminTripRow
            key={t.id}
            trip={{
              id: t.id,
              status: t.status,
              pickupAddress: t.pickupAddress,
              dropoffAddress: t.dropoffAddress,
              scheduledAt: t.scheduledAt.toISOString(),
              customerName: t.customer.name,
              estimatedMinutes: t.estimatedMinutes,
            }}
            drivers={driverOptions}
          />
        ))}
        {trips.length === 0 && <EmptyState title="Sem viagens" body="Os pedidos de viagem aparecem aqui." />}
      </div>
    </AppShell>
  );
}
