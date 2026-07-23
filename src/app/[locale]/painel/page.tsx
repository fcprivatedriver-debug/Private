import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { DRIVER_STATUS_LABELS, OFFER_STATUS_LABELS } from "@/config/constants";
import { formatMoney } from "@/lib/money";
import { PageGreeting, SummaryStrip } from "@/components/ui/PageGreeting";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function DriverDashboardPage() {
  const session = await requireRole("DRIVER");
  const profile = await prisma.driverProfile.findUnique({
    where: { userId: session.user.id },
    include: { vehicles: true },
  });

  const openTrips = await prisma.tripRequest.findMany({
    where: { status: "OPEN" },
    orderBy: { pickupAt: "asc" },
    take: 8,
    include: { _count: { select: { offers: true } } },
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

  return (
    <section className="section">
      <div className="container">
        <PageGreeting
          hello={`Bom trabalho, ${firstName}.`}
          sub="Pedidos à sua volta, propostas enviadas e viagens confirmadas — o seu dia, com clareza."
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

        <div className="cta-row" style={{ margin: "0 0 1.75rem" }}>
          <Link href="/pedidos-abertos" className="btn btn-primary">
            Ver pedidos abertos
          </Link>
          <Link href="/propostas" className="btn btn-secondary">
            As minhas propostas
          </Link>
          <Link href="/viagens" className="btn btn-ghost">
            Viagens
          </Link>
          {profile && (
            <Link href={`/motoristas/${profile.id}`} className="btn btn-ghost">
              O meu perfil público
            </Link>
          )}
        </div>

        <div className="grid-2">
          <div>
            <h2 className="font-display" style={{ fontSize: "1.45rem" }}>
              Pedidos à espera
            </h2>
            <div className="list-stack" style={{ marginTop: "0.75rem" }}>
              {openTrips.map((trip) => (
                <Link key={trip.id} href={`/pedidos/${trip.id}`} className="list-item">
                  <strong>
                    {trip.pickupAddress} → {trip.dropoffAddress}
                  </strong>
                  <span className="muted">
                    {format(trip.pickupAt, "d MMM · HH:mm", { locale: pt })} ·{" "}
                    {trip._count.offers} propostas
                  </span>
                </Link>
              ))}
              {openTrips.length === 0 && (
                <EmptyState
                  title="Sem pedidos abertos neste momento"
                  body="Assim que um cliente publicar um trajeto perto de si, aparece aqui."
                />
              )}
            </div>
          </div>
          <div>
            <h2 className="font-display" style={{ fontSize: "1.45rem" }}>
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
                    {offer.tripRequest.pickupAddress} → {offer.tripRequest.dropoffAddress}
                  </span>
                </Link>
              ))}
            </div>
            <h2 className="font-display" style={{ marginTop: "1.75rem", fontSize: "1.45rem" }}>
              Viagens confirmadas
            </h2>
            <div className="list-stack" style={{ marginTop: "0.75rem" }}>
              {bookings.map((b) => (
                <Link key={b.id} href={`/pedidos/${b.tripRequestId}`} className="list-item">
                  <strong>{formatMoney(b.totalAmount, b.currency)}</strong>
                  <span className="muted">
                    {b.tripRequest.pickupAddress} → {b.tripRequest.dropoffAddress}
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
