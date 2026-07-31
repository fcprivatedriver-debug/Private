import { getLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/AppShell";
import { PageGreeting } from "@/components/ui/PageGreeting";
import { EmptyState } from "@/components/ui/EmptyState";
import { DriverTripCard } from "@/components/driver/DriverTripCard";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { TRIP_STATUS_LABELS } from "@/config/constants";

export default async function MotoristaPage() {
  const session = await requireRole(["DRIVER"]);
  const locale = await getLocale();

  const profile = await prisma.driverProfile.findUnique({
    where: { userId: session.user.id },
    include: { vehicles: { where: { active: true }, take: 1 } },
  });

  const assignments = await prisma.tripAssignment.findMany({
    where: {
      driverUserId: session.user.id,
      status: { in: ["PENDING", "ACCEPTED"] },
      trip: { status: { notIn: ["COMPLETED", "CANCELLED", "NO_SHOW"] } },
    },
    include: {
      trip: { include: { customer: { select: { name: true } } } },
    },
    orderBy: { trip: { scheduledAt: "asc" } },
  });

  const vehicle = profile?.vehicles[0];

  return (
    <AppShell userName={session.user.name} locale={locale}>
      <PageGreeting
        hello={`Bom dia, ${session.user.name?.split(" ")[0] || "Motorista"}.`}
        sub="Viagens atribuídas e ações em tempo real — FC Private Driver."
      />

      {vehicle && (
        <div className="panel" style={{ marginBottom: "1.25rem", background: "var(--bg-ink)", color: "#fff" }}>
          <div className="label-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
            Veículo
          </div>
          <strong>
            {vehicle.make} {vehicle.model}
          </strong>
          <div style={{ color: "rgba(255,255,255,0.72)", fontSize: "0.92rem" }}>
            {vehicle.plate} · {vehicle.color}
          </div>
        </div>
      )}

      <h2 className="font-display" style={{ fontSize: "1.35rem" }}>
        Viagens atribuídas
      </h2>

      {assignments.length === 0 ? (
        <EmptyState
          title="Sem viagens atribuídas"
          body="Quando a administração confirmar e atribuir uma viagem, aparece aqui."
        />
      ) : (
        <div style={{ marginTop: "0.75rem" }}>
          {assignments.map((a) => (
            <div key={a.id}>
              <span className="badge" style={{ marginBottom: "0.35rem", display: "inline-block" }}>
                {TRIP_STATUS_LABELS[a.trip.status]}
              </span>
              <DriverTripCard
                trip={{
                  id: a.trip.id,
                  status: a.trip.status,
                  pickupAddress: a.trip.pickupAddress,
                  dropoffAddress: a.trip.dropoffAddress,
                  scheduledAt: a.trip.scheduledAt.toISOString(),
                  customerName: a.trip.customer.name,
                  estimatedMinutes: a.trip.estimatedMinutes,
                }}
              />
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
