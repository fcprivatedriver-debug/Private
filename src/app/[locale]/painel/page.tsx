import Link from "next/link";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { DRIVER_STATUS_LABELS, OFFER_STATUS_LABELS } from "@/config/constants";
import { formatMoney } from "@/lib/money";

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

  return (
    <section className="section fade-up">
      <div className="container">
        <h1 className="page-title">Painel do motorista</h1>
        <p className="page-lead">
          Estado:{" "}
          <span className="badge">
            {profile ? DRIVER_STATUS_LABELS[profile.status] : "Sem perfil"}
          </span>
        </p>

        <div className="cta-row" style={{ margin: "1.25rem 0 2rem" }}>
          <Link href="/onboarding" className="btn btn-primary">
            Onboarding & verification
          </Link>
          <Link href="/pedidos-abertos" className="btn btn-secondary">
            Ver pedidos abertos
          </Link>
          <Link href="/veiculo" className="btn btn-ghost">
            Gerir veículo
          </Link>
          <Link href="/viagens" className="btn btn-ghost">
            Viagens
          </Link>
          <Link href="/propostas" className="btn btn-ghost">
            As minhas propostas
          </Link>
        </div>

        <div className="grid-2">
          <div>
            <h2 className="font-display">Pedidos abertos</h2>
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
              {openTrips.length === 0 && <div className="empty-state">Sem pedidos abertos.</div>}
            </div>
          </div>
          <div>
            <h2 className="font-display">Propostas recentes</h2>
            <div className="list-stack" style={{ marginTop: "0.75rem" }}>
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
            <h2 className="font-display" style={{ marginTop: "1.75rem" }}>
              Viagens
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
                <div className="empty-state">Ainda sem viagens confirmadas.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
