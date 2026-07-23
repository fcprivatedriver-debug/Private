import Link from "next/link";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { TRIP_STATUS_LABELS } from "@/config/constants";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default async function CustomerTripsPage() {
  const session = await requireRole("CUSTOMER");
  const trips = await prisma.tripRequest.findMany({
    where: { customerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { offers: true } } },
  });

  return (
    <section className="section fade-up">
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h1 className="font-display" style={{ fontSize: "2.4rem", margin: 0 }}>
              Os meus pedidos
            </h1>
            <p className="muted">Acompanha propostas e reservas.</p>
          </div>
          <Link href="/pedidos/novo" className="btn btn-primary">
            Novo pedido
          </Link>
        </div>

        <div className="list-stack" style={{ marginTop: "1.5rem" }}>
          {trips.length === 0 && (
            <div className="panel muted">Ainda não tens pedidos. Cria o primeiro.</div>
          )}
          {trips.map((trip) => (
            <Link key={trip.id} href={`/pedidos/${trip.id}`} className="list-item">
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <strong>
                  {trip.pickupAddress} → {trip.dropoffAddress}
                </strong>
                <span className="badge">{TRIP_STATUS_LABELS[trip.status]}</span>
              </div>
              <div className="muted">
                {format(trip.pickupAt, "d MMM yyyy · HH:mm", { locale: pt })} ·{" "}
                {trip._count.offers} proposta{trip._count.offers === 1 ? "" : "s"}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
