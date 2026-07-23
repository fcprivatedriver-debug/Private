import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import {
  OFFER_STATUS_LABELS,
  TRIP_STATUS_LABELS,
} from "@/config/constants";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { TripActions } from "@/components/trip/TripActions";
import { OfferForm } from "@/components/offer/OfferForm";
import { ReviewForm } from "@/components/trip/ReviewForm";
import { canRevealContacts } from "@/lib/contacts";
import { localizeVehicleClass } from "@/domain/vehicle-class";
import { getLocale } from "next-intl/server";

type Props = { params: Promise<{ id: string }> };

export default async function TripDetailPage({ params }: Props) {
  const session = await requireSession();
  const { id } = await params;
  const locale = await getLocale();

  const trip = await prisma.tripRequest.findUnique({
    where: { id },
    include: {
      offers: {
        include: {
          driver: {
            select: {
              id: true,
              name: true,
              phone: true,
              driverProfile: true,
            },
          },
          vehicle: { include: { vehicleClass: true } },
        },
        orderBy: { priceAmount: "asc" },
      },
      booking: { include: { payment: true, review: true } },
      customer: { select: { id: true, name: true, phone: true } },
      preferredVehicleClass: true,
    },
  });

  if (!trip) notFound();

  const isOwner = trip.customerId === session.user.id;
  const isDriver = session.user.role === "DRIVER";
  const isAdmin = session.user.role === "ADMIN";
  const isAssignedDriver = trip.booking?.driverId === session.user.id;

  if (!isOwner && !isDriver && !isAdmin) notFound();

  const revealContacts =
    trip.booking != null &&
    canRevealContacts({
      viewerId: session.user.id,
      customerId: trip.customerId,
      driverId: trip.booking.driverId,
      bookingStatus: trip.booking.status,
      paymentStatus: trip.booking.payment?.status,
      isAdmin,
    });

  const canManageJourney = Boolean(isOwner || isAssignedDriver || isAdmin);

  const driverVehicles =
    isDriver
      ? await prisma.driverProfile.findUnique({
          where: { userId: session.user.id },
          include: { vehicles: { include: { vehicleClass: true } } },
        })
      : null;

  const myOffer = trip.offers.find((o) => o.driverId === session.user.id);

  return (
    <section className="section fade-up">
      <div className="container grid-2">
        <div>
          <span className="badge">{TRIP_STATUS_LABELS[trip.status]}</span>
          <h1 className="font-display" style={{ fontSize: "2.2rem", marginTop: "0.75rem" }}>
            {trip.pickupAddress}
            <span className="muted"> → </span>
            {trip.dropoffAddress}
          </h1>
          <p className="muted">
            {format(trip.pickupAt, "EEEE, d MMMM yyyy · HH:mm", { locale: pt })}
          </p>
          <div className="panel" style={{ marginTop: "1.25rem" }}>
            <p>
              <strong>{trip.passengers}</strong> passageiros · <strong>{trip.luggage}</strong> malas
            </p>
            {trip.flightNumber && <p className="muted">Voo {trip.flightNumber}</p>}
            {trip.preferredVehicleClass && (
              <p className="muted">
                Preferência: {localizeVehicleClass(trip.preferredVehicleClass, locale).name}
              </p>
            )}
            {trip.notes && <p style={{ marginTop: "0.75rem" }}>{trip.notes}</p>}
            {revealContacts && (
              <div className="alert alert-info" style={{ marginTop: "1rem", marginBottom: 0 }}>
                Contacts (visible after payment confirmed):{" "}
                {isOwner
                  ? trip.offers.find((o) => o.id === trip.acceptedOfferId)?.driver.phone || "—"
                  : trip.customer.phone || "—"}
              </div>
            )}
            {!revealContacts && trip.booking && (
              <div className="alert alert-info" style={{ marginTop: "1rem", marginBottom: 0 }}>
                Contact details unlock after payment is confirmed.
              </div>
            )}
          </div>

          {(isOwner || isAssignedDriver || isAdmin) && (
            <TripActions
              tripId={trip.id}
              status={trip.status}
              booking={trip.booking}
              canManageJourney={canManageJourney}
              canCancel={isOwner || isAdmin}
            />
          )}

          {isOwner && trip.status === "COMPLETED" && trip.booking && !trip.booking.review && (
            <ReviewForm bookingId={trip.booking.id} />
          )}
          {(isOwner || isAdmin) && trip.booking?.review && (
            <div className="panel" style={{ marginTop: "1rem" }}>
              <strong>{isOwner ? "A tua avaliação" : "Avaliação"}:</strong> ★{" "}
              {trip.booking.review.rating}
              {trip.booking.review.comment ? ` — ${trip.booking.review.comment}` : ""}
            </div>
          )}
        </div>

        <div>
          {(isOwner || isAdmin) && (
            <>
              <h2 className="font-display">Propostas</h2>
              <div className="list-stack" style={{ marginTop: "0.75rem" }}>
                {trip.offers.length === 0 && (
                  <div className="empty-state">Ainda sem propostas. Os motoristas vão aparecer aqui.</div>
                )}
                {trip.offers.map((offer) => (
                  <div key={offer.id} className="list-item">
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                      <strong>{formatMoney(offer.priceAmount, offer.currency)}</strong>
                      <span className="badge">{OFFER_STATUS_LABELS[offer.status]}</span>
                    </div>
                    <div>
                      {offer.driver.name}
                      {offer.driver.driverProfile?.ratingAvg
                        ? ` · ★ ${offer.driver.driverProfile.ratingAvg.toFixed(1)}`
                        : ""}
                    </div>
                    {offer.vehicle && (
                      <div className="muted">
                        {offer.vehicle.make} {offer.vehicle.model} ·{" "}
                        {localizeVehicleClass(offer.vehicle.vehicleClass, locale).name}
                        {offer.vehicle.ratingCount
                          ? ` · ★ ${offer.vehicle.ratingAvg?.toFixed(1)} veículo`
                          : ""}
                      </div>
                    )}
                    {offer.message && <p>{offer.message}</p>}
                    {isOwner && offer.status === "PENDING" && trip.status === "OPEN" && (
                      <TripActions tripId={trip.id} status={trip.status} acceptOfferId={offer.id} />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {isDriver && trip.status === "OPEN" && (
            <>
              <h2 className="font-display">A tua proposta</h2>
              {myOffer && (
                <div className="alert alert-info">
                  Proposta atual: {formatMoney(myOffer.priceAmount)} ({OFFER_STATUS_LABELS[myOffer.status]})
                </div>
              )}
              <OfferForm
                tripRequestId={trip.id}
                vehicles={(driverVehicles?.vehicles || []).map((v) => ({
                  id: v.id,
                  make: v.make,
                  model: v.model,
                  className: localizeVehicleClass(v.vehicleClass, locale).name,
                }))}
                existingPrice={myOffer ? myOffer.priceAmount / 100 : undefined}
              />
            </>
          )}

          {isDriver && myOffer && trip.status !== "OPEN" && (
            <div className="panel">
              <h2 className="font-display">Estado</h2>
              <p>
                {formatMoney(myOffer.priceAmount)} · {OFFER_STATUS_LABELS[myOffer.status]}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
