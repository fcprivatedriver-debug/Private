import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { TRIP_STATUS_LABELS } from "@/config/constants";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { PageGreeting, SummaryStrip } from "@/components/ui/PageGreeting";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function CustomerTripsPage() {
  const session = await requireRole("CUSTOMER");
  const trips = await prisma.tripRequest.findMany({
    where: { customerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { offers: true } } },
  });

  const open = trips.filter((t) => t.status === "OPEN").length;
  const upcoming = trips.filter((t) => ["CONFIRMED", "IN_PROGRESS"].includes(t.status)).length;
  const done = trips.filter((t) => t.status === "COMPLETED").length;
  const firstName = session.user.name?.split(" ")[0] || "olá";

  return (
    <section className="section">
      <div className="container">
        <PageGreeting
          hello={`Olá, ${firstName}.`}
          sub="Aqui encontra as suas viagens — as que pediu, as que estão a caminho, e as que já o levaram bem."
        />
        <SummaryStrip
          items={[
            { label: "À espera de propostas", value: String(open) },
            { label: "Para hoje / em breve", value: String(upcoming) },
            { label: "Concluídas", value: String(done) },
          ]}
        />

        <div className="page-head" style={{ marginBottom: "1rem" }}>
          <div>
            <h2 className="font-display" style={{ fontSize: "1.55rem", margin: 0 }}>
              As suas viagens
            </h2>
            <p className="muted" style={{ margin: "0.35rem 0 0" }}>
              Tudo o que importa, num só sítio.
            </p>
          </div>
          <Link href="/pedidos/novo" className="btn btn-primary">
            Pedir uma viagem
          </Link>
        </div>

        <div className="list-stack">
          {trips.length === 0 && (
            <EmptyState
              title="Ainda não tem viagens"
              body="Quando estiver pronto, diga-nos onde o devemos encontrar — e a ZRIK trata do resto."
              actionHref="/pedidos/novo"
              actionLabel="Pedir a primeira viagem"
            />
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
