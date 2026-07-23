import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default async function OpenTripsPage() {
  await requireRole("DRIVER");
  const trips = await prisma.tripRequest.findMany({
    where: { status: "OPEN" },
    orderBy: { pickupAt: "asc" },
    include: { _count: { select: { offers: true } } },
  });

  return (
    <section className="section fade-up">
      <div className="container">
        <h1 className="page-title">
          Pedidos abertos
        </h1>
        <p className="lead">Envia propostas aos trajetos que te interessam.</p>
        <div className="list-stack">
          {trips.map((trip) => (
            <Link key={trip.id} href={`/pedidos/${trip.id}`} className="list-item">
              <strong>
                {trip.pickupAddress} → {trip.dropoffAddress}
              </strong>
              <span className="muted">
                {format(trip.pickupAt, "d MMM yyyy · HH:mm", { locale: pt })} · {trip.passengers}{" "}
                pax · {trip._count.offers} propostas
              </span>
            </Link>
          ))}
          {trips.length === 0 && <div className="empty-state">Não há pedidos abertos de momento.</div>}
        </div>
      </div>
    </section>
  );
}
