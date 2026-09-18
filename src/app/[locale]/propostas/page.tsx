import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { OFFER_STATUS_LABELS } from "@/config/constants";
import { WithdrawButton } from "@/components/offer/WithdrawButton";
import { DriverHubTabs } from "@/components/driver/DriverHubTabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { shortLocationLabel } from "@/lib/location-label";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default async function MyOffersPage() {
  const session = await requireRole("DRIVER");
  const offers = await prisma.offer.findMany({
    where: { driverId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { tripRequest: true, vehicle: true },
  });

  return (
    <section className="section fade-up">
      <div className="container" style={{ maxWidth: 720 }}>
        <DriverHubTabs active="propostas" />
        <h1 className="page-title" style={{ marginTop: "1rem" }}>
          As minhas propostas
        </h1>
        <p className="lead">Todas as propostas que enviou — nunca as de outros motoristas.</p>

        <div className="trip-card-stack" style={{ marginTop: "1rem" }}>
          {offers.map((offer) => {
            const trip = offer.tripRequest;
            const href =
              offer.status === "ACCEPTED"
                ? `/pedidos/${trip.id}`
                : `/pedidos/${trip.id}`;
            return (
              <article key={offer.id} className="trip-card">
                <div className="trip-card-when">
                  {format(trip.pickupAt, "d MMM · HH:mm", { locale: pt })}
                  <span className="badge">{OFFER_STATUS_LABELS[offer.status]}</span>
                </div>
                <div className="trip-card-route">
                  <div className="trip-card-point">
                    <span className="trip-card-letter" aria-hidden>
                      A
                    </span>
                    <span>{shortLocationLabel(trip.pickupAddress)}</span>
                  </div>
                  <div className="trip-card-arrow" aria-hidden>
                    ↓
                  </div>
                  <div className="trip-card-point">
                    <span className="trip-card-letter" aria-hidden>
                      B
                    </span>
                    <span>{shortLocationLabel(trip.dropoffAddress)}</span>
                  </div>
                </div>
                <div className="trip-card-meta">
                  <strong>A minha proposta: {formatMoney(offer.priceAmount, offer.currency)}</strong>
                </div>
                <div className="trip-card-actions">
                  <Link href={href} className="btn btn-primary btn-sm">
                    Ver detalhe
                  </Link>
                  {offer.status === "PENDING" && <WithdrawButton offerId={offer.id} />}
                </div>
              </article>
            );
          })}
          {offers.length === 0 && (
            <EmptyState
              title="Ainda sem propostas"
              body="Escolha um pedido aberto e diga quanto vale a viagem para si."
              actionHref="/pedidos-abertos"
              actionLabel="Ver pedidos"
            />
          )}
        </div>
      </div>
    </section>
  );
}
