import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { DRIVER_STATUS_LABELS, OFFER_STATUS_LABELS } from "@/config/constants";
import { formatMoney } from "@/lib/money";
import { PageGreeting, SummaryStrip } from "@/components/ui/PageGreeting";
import { EmptyState } from "@/components/ui/EmptyState";
import { DocumentsStatusPanel } from "@/components/driver/DocumentsStatusPanel";
import { TripRequestCard } from "@/components/trip/TripRequestCard";
import { localizeVehicleClass } from "@/domain/vehicle-class";
import { shortLocationLabel } from "@/lib/location-label";

export default async function DriverDashboardPage() {
  const session = await requireRole("DRIVER");
  const { repairMarketplaceSchema, repairDriverProfileColumns } = await import(
    "@/lib/db-repair"
  );
  await repairDriverProfileColumns();
  await repairMarketplaceSchema();

  const profile = await prisma.driverProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      vehicles: true,
      verificationDocs: {
        orderBy: { createdAt: "desc" },
        select: {
          type: true,
          status: true,
          reviewedAt: true,
          createdAt: true,
        },
      },
    },
  });

  const openTrips = await prisma.tripRequest.findMany({
    where: { status: "OPEN" },
    orderBy: { pickupAt: "asc" },
    take: 8,
    include: {
      preferredVehicleClass: true,
      offers: {
        where: { driverId: session.user.id },
        select: { id: true, status: true },
        take: 1,
      },
    },
  });

  const myOffers = await prisma.offer.findMany({
    where: { driverId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { tripRequest: true },
  });

  const bookings = await prisma.booking.findMany({
    where: { driverId: session.user.id, status: { in: ["PAID", "PENDING_PAYMENT", "COMPLETED"] } },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { tripRequest: true },
  });

  const firstName = session.user.name?.split(" ")[0] || "Motorista";
  const vehicle = profile?.vehicles[0];
  const locale = "pt";

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 920 }}>
        <PageGreeting
          hello={`Bom trabalho, ${firstName}.`}
          sub="Pedidos, propostas e verificação — o essencial do seu dia."
        />

        <SummaryStrip
          items={[
            {
              label: "Perfil",
              value: profile ? DRIVER_STATUS_LABELS[profile.status] : "—",
            },
            {
              label: "Avaliação",
              value: profile?.ratingAvg ? `★ ${profile.ratingAvg.toFixed(1)}` : "Nova",
            },
            {
              label: "Pedidos abertos",
              value: String(openTrips.length),
            },
          ]}
        />

        <div className="cta-row" style={{ margin: "0 0 1.25rem" }}>
          <Link href="/pedidos-abertos" className="btn btn-primary">
            Pedidos
          </Link>
          <Link href="/propostas" className="btn btn-secondary">
            As minhas propostas
          </Link>
          <Link href="/viagens" className="btn btn-ghost">
            Viagens
          </Link>
        </div>

        {profile && (
          <div style={{ marginBottom: "1.5rem" }}>
            <DocumentsStatusPanel
              docs={profile.verificationDocs}
              onboardingStatus={profile.onboardingStatus}
              driverStatus={profile.status}
            />
          </div>
        )}

        {vehicle && (
          <div className="ink-band fade-up">
            <div className="muted" style={{ marginBottom: "0.35rem" }}>
              O seu veículo
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <strong style={{ fontSize: "1.2rem" }}>
                  {vehicle.make} {vehicle.model}
                </strong>
                <div className="muted">
                  {vehicle.plate} · {vehicle.year}
                  {vehicle.ratingCount
                    ? ` · ★ ${vehicle.ratingAvg?.toFixed(1)} veículo`
                    : ""}
                </div>
              </div>
              <div className="cta-row">
                <Link href={`/veiculos/${vehicle.id}`} className="btn btn-secondary btn-sm" style={{ color: "#f4f6f5", borderColor: "rgba(244,246,245,0.35)" }}>
                  Ver perfil
                </Link>
                <Link href="/veiculo" className="btn btn-primary btn-sm" style={{ background: "#f4f6f5", color: "var(--brand)" }}>
                  Gerir
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="grid-2">
          <div>
            <h2 className="font-display" style={{ fontSize: "1.35rem" }}>
              Pedidos à espera
            </h2>
            <div className="trip-card-stack" style={{ marginTop: "0.75rem" }}>
              {openTrips.map((trip) => (
                <TripRequestCard
                  key={trip.id}
                  locale={locale}
                  trip={{
                    id: trip.id,
                    pickupAddress: trip.pickupAddress,
                    dropoffAddress: trip.dropoffAddress,
                    pickupAt: trip.pickupAt,
                    passengers: trip.passengers,
                    luggage: trip.luggage,
                    distanceMeters: trip.distanceMeters,
                    durationSeconds: trip.durationSeconds,
                    flightNumber: trip.flightNumber,
                    className: trip.preferredVehicleClass
                      ? localizeVehicleClass(trip.preferredVehicleClass, locale).name
                      : null,
                    myOfferId: trip.offers[0]?.id ?? null,
                    myOfferStatus: trip.offers[0]?.status ?? null,
                  }}
                />
              ))}
              {openTrips.length === 0 && (
                <EmptyState
                  title="Sem pedidos abertos neste momento"
                  body="Assim que um cliente publicar um trajeto, aparece aqui."
                />
              )}
            </div>
          </div>
          <div>
            <h2 className="font-display" style={{ fontSize: "1.35rem" }}>
              Propostas recentes
            </h2>
            <div className="list-stack" style={{ marginTop: "0.75rem" }}>
              {myOffers.length === 0 && (
                <EmptyState
                  title="Ainda sem propostas enviadas"
                  body="Escolha um pedido aberto e diga quanto vale a viagem para si."
                  actionHref="/pedidos-abertos"
                  actionLabel="Explorar pedidos"
                />
              )}
              {myOffers.map((offer) => (
                <Link key={offer.id} href={`/pedidos/${offer.tripRequestId}`} className="list-item">
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong>{formatMoney(offer.priceAmount)}</strong>
                    <span className="badge">{OFFER_STATUS_LABELS[offer.status]}</span>
                  </div>
                  <span className="muted">
                    {shortLocationLabel(offer.tripRequest.pickupAddress)} →{" "}
                    {shortLocationLabel(offer.tripRequest.dropoffAddress)}
                  </span>
                </Link>
              ))}
            </div>
            <h2 className="font-display" style={{ marginTop: "1.75rem", fontSize: "1.35rem" }}>
              Viagens confirmadas
            </h2>
            <div className="list-stack" style={{ marginTop: "0.75rem" }}>
              {bookings.map((b) => (
                <Link key={b.id} href={`/pedidos/${b.tripRequestId}`} className="list-item">
                  <strong>{formatMoney(b.totalAmount, b.currency)}</strong>
                  <span className="muted">
                    {shortLocationLabel(b.tripRequest.pickupAddress)} →{" "}
                    {shortLocationLabel(b.tripRequest.dropoffAddress)}
                  </span>
                </Link>
              ))}
              {bookings.length === 0 && (
                <EmptyState
                  title="Ainda sem viagens confirmadas"
                  body="Quando um cliente aceitar a sua proposta, a viagem aparece aqui."
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
