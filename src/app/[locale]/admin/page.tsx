import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { VerifyDriverButton } from "@/components/admin/VerifyDriverButton";
import { TRIP_STATUS_LABELS } from "@/config/constants";
import { Link } from "@/i18n/navigation";

export default async function AdminPage() {
  await requireRole("ADMIN");

  const [pendingDrivers, stats, recentTrips, classCount] = await Promise.all([
    prisma.driverProfile.findMany({
      where: { status: "PENDING_VERIFICATION" },
      include: { user: true, vehicles: true },
    }),
    Promise.all([
      prisma.tripRequest.count(),
      prisma.offer.count(),
      prisma.booking.count(),
      prisma.user.count({ where: { role: "DRIVER" } }),
    ]),
    prisma.tripRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { customer: { select: { name: true } } },
    }),
    prisma.vehicleClass.count({ where: { active: true } }),
  ]);

  const [tripCount, offerCount, bookingCount, driverCount] = stats;

  return (
    <section className="section fade-up">
      <div className="container">
        <h1 className="page-title">Admin Movio</h1>
        <p className="page-lead">Operações, verificações e visão geral da plataforma.</p>
        <div className="cta-row" style={{ marginBottom: "0.5rem" }}>
          <Link href="/admin/verificacoes" className="btn btn-primary">
            AI verification queue
          </Link>
          <Link href="/admin/vehicle-classes" className="btn btn-secondary">
            Vehicle classes ({classCount})
          </Link>
        </div>
        <div className="metric-row">
          <div className="metric">
            <div className="step-num">{tripCount}</div>
            <div className="muted">Pedidos</div>
          </div>
          <div className="metric">
            <div className="step-num">{offerCount}</div>
            <div className="muted">Propostas</div>
          </div>
          <div className="metric">
            <div className="step-num">{bookingCount}</div>
            <div className="muted">Reservas</div>
          </div>
          <div className="metric">
            <div className="step-num">{driverCount}</div>
            <div className="muted">Motoristas</div>
          </div>
        </div>

        <h2 className="font-display">Verificações pendentes</h2>
        <div className="list-stack" style={{ marginTop: "0.75rem", marginBottom: "2rem" }}>
          {pendingDrivers.map((d) => (
            <div key={d.id} className="list-item">
              <strong>
                {d.user.name} · {d.user.email}
              </strong>
              <div className="muted">
                {d.vehicles[0]
                  ? `${d.vehicles[0].make} ${d.vehicles[0].model} · ${d.vehicles[0].plate}`
                  : "Sem veículo"}
              </div>
              <VerifyDriverButton driverProfileId={d.id} />
            </div>
          ))}
          {pendingDrivers.length === 0 && (
            <div className="empty-state">Nenhuma verificação pendente.</div>
          )}
        </div>

        <h2 className="font-display">Pedidos recentes</h2>
        <div className="list-stack" style={{ marginTop: "0.75rem" }}>
          {recentTrips.map((trip) => (
            <div key={trip.id} className="list-item">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>
                  {trip.pickupAddress} → {trip.dropoffAddress}
                </strong>
                <span className="badge">{TRIP_STATUS_LABELS[trip.status]}</span>
              </div>
              <span className="muted">{trip.customer.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
