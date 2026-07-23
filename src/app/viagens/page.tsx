import Link from "next/link";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { TRIP_STATUS_LABELS } from "@/config/constants";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default async function DriverTripsPage() {
  const session = await requireRole("DRIVER");
  const bookings = await prisma.booking.findMany({
    where: { driverId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      tripRequest: true,
      review: true,
    },
  });

  return (
    <section className="section fade-up">
      <div className="container">
        <h1 className="font-display" style={{ fontSize: "2.4rem" }}>
          As minhas viagens
        </h1>
        <p className="lead">Reservas confirmadas e histórico.</p>
        <div className="list-stack">
          {bookings.map((b) => (
            <Link key={b.id} href={`/pedidos/${b.tripRequestId}`} className="list-item">
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <strong>
                  {b.tripRequest.pickupAddress} → {b.tripRequest.dropoffAddress}
                </strong>
                <span className="badge">{TRIP_STATUS_LABELS[b.tripRequest.status]}</span>
              </div>
              <span className="muted">
                {format(b.tripRequest.pickupAt, "d MMM yyyy · HH:mm", { locale: pt })} ·{" "}
                {formatMoney(b.totalAmount, b.currency)}
                {b.review ? ` · ★ ${b.review.rating}` : ""}
              </span>
            </Link>
          ))}
          {bookings.length === 0 && <div className="panel muted">Ainda sem viagens.</div>}
        </div>
      </div>
    </section>
  );
}
