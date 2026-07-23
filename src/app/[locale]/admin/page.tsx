import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { VerifyDriverButton } from "@/components/admin/VerifyDriverButton";
import { TRIP_STATUS_LABELS } from "@/config/constants";
import { Link } from "@/i18n/navigation";
import { PageGreeting, SummaryStrip } from "@/components/ui/PageGreeting";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function AdminPage() {
  await requireRole("ADMIN");

  const [pendingDrivers, stats, recentTrips, classCount, completedToday] = await Promise.all([
    prisma.driverProfile.findMany({
      where: { status: "PENDING_VERIFICATION" },
      include: { user: true, vehicles: true },
    }),
    Promise.all([
      prisma.tripRequest.count(),
      prisma.offer.count(),
      prisma.booking.count(),
      prisma.user.count({ where: { role: "DRIVER" } }),
      prisma.vehicle.count(),
      prisma.payment.count(),
      prisma.review.count(),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
    ]),
    prisma.tripRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { customer: { select: { name: true } } },
    }),
    prisma.vehicleClass.count({ where: { active: true } }),
    prisma.tripRequest.count({
      where: {
        status: "COMPLETED",
        updatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);

  const [
    tripCount,
    offerCount,
    bookingCount,
    driverCount,
    vehicleCount,
    paymentCount,
    reviewCount,
    customerCount,
  ] = stats;

  return (
    <section className="section">
      <div className="container">
        <PageGreeting
          hello="Centro de operações Movio"
          sub="Uma visão calma do marketplace — pessoas, viagens e confiança em verificação."
        />
        <SummaryStrip
          items={[
            { label: "Verificações em fila", value: String(pendingDrivers.length) },
            { label: "Concluídas hoje", value: String(completedToday) },
            { label: "Classes ativas", value: String(classCount) },
          ]}
        />

        <div className="cta-row" style={{ marginBottom: "1rem" }}>
          <Link href="/admin/verificacoes" className="btn btn-primary">
            Fila de verificação
          </Link>
          <Link href="/admin/vehicle-classes" className="btn btn-secondary">
            Classes de veículo ({classCount})
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
        <div className="metric-row">
          <div className="metric">
            <div className="step-num">{customerCount}</div>
            <div className="muted">Clientes</div>
          </div>
          <div className="metric">
            <div className="step-num">{vehicleCount}</div>
            <div className="muted">Veículos</div>
          </div>
          <div className="metric">
            <div className="step-num">{paymentCount}</div>
            <div className="muted">Pagamentos</div>
          </div>
          <div className="metric">
            <div className="step-num">{reviewCount}</div>
            <div className="muted">Avaliações</div>
          </div>
        </div>

        <h2 className="font-display" style={{ fontSize: "1.45rem" }}>
          À espera da sua decisão
        </h2>
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
              <div className="cta-row" style={{ marginTop: "0.5rem" }}>
                <Link href={`/motoristas/${d.id}`} className="btn btn-ghost btn-sm">
                  Ver perfil
                </Link>
                <VerifyDriverButton driverProfileId={d.id} />
              </div>
            </div>
          ))}
          {pendingDrivers.length === 0 && (
            <EmptyState
              title="Nada pendente"
              body="Quando um motorista submeter documentos, aparece aqui para revisão."
            />
          )}
        </div>

        <h2 className="font-display" style={{ fontSize: "1.45rem" }}>
          Atividade recente
        </h2>
        <div className="list-stack" style={{ marginTop: "0.75rem" }}>
          {recentTrips.map((trip) => (
            <Link key={trip.id} href={`/pedidos/${trip.id}`} className="list-item">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>
                  {trip.pickupAddress} → {trip.dropoffAddress}
                </strong>
                <span className="badge">{TRIP_STATUS_LABELS[trip.status]}</span>
              </div>
              <span className="muted">{trip.customer.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
