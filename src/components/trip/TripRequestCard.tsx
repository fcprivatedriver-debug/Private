import { Link } from "@/i18n/navigation";
import { format } from "date-fns";
import { pt, enUS } from "date-fns/locale";
import { shortLocationLabel } from "@/lib/location-label";
import { formatDistance, formatDuration } from "@/lib/maps/route";

export type TripCardData = {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupAt: Date | string;
  passengers: number;
  luggage: number;
  distanceMeters: number | null;
  durationSeconds: number | null;
  flightNumber?: string | null;
  className?: string | null;
  myOfferId?: string | null;
  myOfferStatus?: string | null;
};

export function TripRequestCard({
  trip,
  locale = "pt",
}: {
  trip: TripCardData;
  locale?: string;
}) {
  const pickupAt = typeof trip.pickupAt === "string" ? new Date(trip.pickupAt) : trip.pickupAt;
  const dfLocale = locale.startsWith("en") ? enUS : pt;
  const hasOffer = Boolean(trip.myOfferId);
  const href = `/pedidos/${trip.id}`;

  return (
    <article className={`trip-card ${hasOffer ? "trip-card-offered" : ""}`}>
      <div className="trip-card-when">
        {format(pickupAt, "d MMM · HH:mm", { locale: dfLocale })}
        {hasOffer && <span className="badge badge-success">Proposta enviada</span>}
      </div>

      <div className="trip-card-route" aria-label="Trajeto">
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
        <span>
          {formatDistance(trip.distanceMeters)} · {formatDuration(trip.durationSeconds)}
        </span>
        {trip.className && <span>{trip.className}</span>}
        <span>
          {trip.passengers} passag.
          {trip.luggage > 0 ? ` · ${trip.luggage} mala${trip.luggage === 1 ? "" : "s"}` : ""}
        </span>
        {trip.flightNumber && <span>Voo {trip.flightNumber}</span>}
      </div>

      <div className="trip-card-actions">
        {hasOffer ? (
          <Link href={href} className="btn btn-secondary btn-sm">
            Ver a minha proposta
          </Link>
        ) : (
          <Link href={href} className="btn btn-primary btn-sm">
            Ver pedido
          </Link>
        )}
      </div>
    </article>
  );
}
