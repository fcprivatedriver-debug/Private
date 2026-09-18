import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { TRIP_STATUS_LABELS } from "@/config/constants";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { PageGreeting, SummaryStrip } from "@/components/ui/PageGreeting";
import { EmptyState } from "@/components/ui/EmptyState";
import { shortLocationLabel } from "@/lib/location-label";

function compactTripStatus(status: string, offerCount: number): string {
  if (status === "OPEN") {
    if (offerCount === 0) return "À procura de motoristas · 0 propostas";
    if (offerCount === 1) return "1 proposta recebida";
    return `${offerCount} propostas recebidas`;
  }
  return TRIP_STATUS_LABELS[status] || status;
}

export default async function CustomerTripsPage() {
  const session = await requireRole("CUSTOMER");
  const { repairMarketplaceSchema } = await import("@/lib/db-repair");
  await repairMarketplaceSchema();

  const trips = await prisma.tripRequest.findMany({
    where: { customerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { offers: true } } },
  });

  const open = trips.filter((t) => t.status === "OPEN").length;
  const upcoming = trips.filter((t) =>
    ["CONFIRMED", "IN_PROGRESS", "OFFER_ACCEPTED", "DRIVER_EN_ROUTE", "DRIVER_ARRIVED"].includes(
      t.status,
    ),
  ).length;
  const done = trips.filter((t) => t.status === "COMPLETED").length;
  const firstName = session.user.name?.split(" ")[0] || "olá";

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 720 }}>
        <PageGreeting
          hello={`Olá, ${firstName}.`}
          sub="As suas viagens — pedidas, a caminho, ou já concluídas."
        />
        <SummaryStrip
          items={[
            { label: "À espera", value: String(open) },
            { label: "Em breve", value: String(upcoming) },
            { label: "Concluídas", value: String(done) },
          ]}
        />

        <div className="page-head" style={{ marginBottom: "1rem" }}>
          <div>
            <h2 className="font-display" style={{ fontSize: "1.45rem", margin: 0 }}>
              As minhas viagens
            </h2>
          </div>
          <Link href="/pedidos/novo" className="btn btn-primary btn-sm">
            Pedir viagem
          </Link>
        </div>

        <div className="trip-card-stack">
          {trips.length === 0 && (
            <EmptyState
              title="Ainda não tem viagens"
              body="Quando estiver pronto, diga-nos onde o devemos encontrar."
              actionHref="/pedidos/novo"
              actionLabel="Pedir a primeira viagem"
            />
          )}
          {trips.map((trip) => (
            <Link key={trip.id} href={`/pedidos/${trip.id}`} className="trip-card trip-card-link">
              <div className="trip-card-when">
                {format(trip.pickupAt, "d MMM · HH:mm", { locale: pt })}
              </div>
              <div className="trip-card-route-inline">
                <strong>
                  {shortLocationLabel(trip.pickupAddress)} →{" "}
                  {shortLocationLabel(trip.dropoffAddress)}
                </strong>
              </div>
              <div className="trip-card-meta">
                <span>{compactTripStatus(trip.status, trip._count.offers)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
