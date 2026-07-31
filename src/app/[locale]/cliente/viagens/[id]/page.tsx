import { notFound } from "next/navigation";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageGreeting } from "@/components/ui/PageGreeting";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatMinutes } from "@/lib/utils";
import { TRIP_STATUS_LABELS } from "@/config/constants";

const CONFIRMED_STATUSES = new Set([
  "CONFIRMED",
  "DRIVER_ASSIGNED",
  "DRIVER_EN_ROUTE",
  "DRIVER_ARRIVED",
  "IN_PROGRESS",
  "COMPLETED",
]);

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole(["CUSTOMER"]);
  const locale = await getLocale();
  const { id } = await params;

  const trip = await prisma.trip.findFirst({
    where: { id, customerId: session.user.id },
    include: {
      timer: true,
      assignments: {
        where: { status: "ACCEPTED" },
        include: {
          driver: { include: { user: true, vehicles: { where: { active: true }, take: 1 } } },
        },
        take: 1,
      },
    },
  });

  if (!trip) notFound();

  const assignment = trip.assignments[0];
  const showDriver = CONFIRMED_STATUSES.has(trip.status) && assignment;

  return (
    <AppShell userName={session.user.name} showCustomerNav activePath="/cliente" locale={locale}>
      <PageGreeting
        hello="Detalhe da viagem"
        sub={`${trip.pickupAddress} → ${trip.dropoffAddress}`}
      />

      <div className="panel panel-lift">
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <span className="badge">{TRIP_STATUS_LABELS[trip.status]}</span>
          {trip.isImmediate && <span className="badge badge-warn">Pedido imediato</span>}
        </div>

        <dl style={{ marginTop: "1.25rem", display: "grid", gap: "0.75rem" }}>
          <div>
            <dt className="label-sm">Data e hora</dt>
            <dd>{format(trip.scheduledAt, "EEEE, d MMMM yyyy · HH:mm", { locale: pt })}</dd>
          </div>
          <div>
            <dt className="label-sm">Origem</dt>
            <dd>{trip.pickupAddress}</dd>
          </div>
          <div>
            <dt className="label-sm">Destino</dt>
            <dd>{trip.dropoffAddress}</dd>
          </div>
          <div>
            <dt className="label-sm">Passageiros / bagagem</dt>
            <dd>
              {trip.passengers} passageiro{trip.passengers !== 1 ? "s" : ""} · {trip.luggage} peça
              {trip.luggage !== 1 ? "s" : ""} de bagagem
            </dd>
          </div>
          {trip.estimatedMinutes && (
            <div>
              <dt className="label-sm">Minutos estimados</dt>
              <dd>{formatMinutes(trip.estimatedMinutes)}</dd>
            </div>
          )}
          {trip.chargedMinutes != null && (
            <div>
              <dt className="label-sm">Minutos cobrados</dt>
              <dd>{formatMinutes(trip.chargedMinutes)}</dd>
            </div>
          )}
          {trip.notes && (
            <div>
              <dt className="label-sm">Notas</dt>
              <dd>{trip.notes}</dd>
            </div>
          )}
        </dl>

        {trip.timer && (
          <div className="estimate-summary" style={{ marginTop: "1.25rem" }}>
            <strong>Cronómetro</strong>
            <p className="muted" style={{ margin: "0.35rem 0 0" }}>
              {trip.timer.totalMinutes > 0
                ? `Total: ${formatMinutes(trip.timer.totalMinutes)} (viagem ${formatMinutes(trip.timer.tripMinutes)}`
                : "A aguardar início"}
              {trip.timer.waitingMinutes > 0 && ` · espera ${formatMinutes(trip.timer.waitingMinutes)}`}
              {trip.timer.totalMinutes > 0 && ")"}
            </p>
          </div>
        )}

        {showDriver && assignment && (
          <div className="panel" style={{ marginTop: "1.25rem", background: "var(--bg-soft)" }}>
            <h3 className="font-display" style={{ fontSize: "1.1rem" }}>
              O seu motorista
            </h3>
            <p style={{ margin: "0.5rem 0 0" }}>
              <strong>{assignment.driver.user.name}</strong>
            </p>
            {assignment.driver.phone && <p className="muted">{assignment.driver.phone}</p>}
            {assignment.driver.vehicles[0] && (
              <p className="muted">
                {assignment.driver.vehicles[0].make} {assignment.driver.vehicles[0].model} ·{" "}
                {assignment.driver.vehicles[0].plate}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="cta-row" style={{ marginTop: "1rem" }}>
        <Link href="/cliente" className="btn btn-ghost">
          ← Voltar ao painel
        </Link>
      </div>
    </AppShell>
  );
}
