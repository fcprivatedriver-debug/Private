import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { TRIP_STATUS_LABELS } from "@/config/constants";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { TripActions } from "@/components/trip/TripActions";
import { OfferForm } from "@/components/offer/OfferForm";
import { OfferCards } from "@/components/offer/OfferCards";
import { ReviewForm } from "@/components/trip/ReviewForm";
import { JourneyTracker } from "@/components/trip/JourneyTracker";
import { canRevealContacts } from "@/lib/contacts";
import { localizeVehicleClass } from "@/domain/vehicle-class";
import { getLocale } from "next-intl/server";
import { TripRouteMap } from "@/components/map/TripRouteMap";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDistance, formatDuration } from "@/lib/maps/route";
import { OFFER_STATUS_LABELS } from "@/config/constants";

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
              image: true,
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

  const offerCards = trip.offers.map((offer) => ({
    id: offer.id,
    priceAmount: offer.priceAmount,
    currency: offer.currency,
    message: offer.message,
    estimatedArrivalMinutes: offer.estimatedArrivalMinutes,
    createdAt: offer.createdAt,
    driver: {
      id: offer.driver.id,
      name: offer.driver.name || "Motorista",
      image: offer.driver.image,
      profileId: offer.driver.driverProfile?.id,
      photoUrl: offer.driver.driverProfile?.photoUrl,
      ratingAvg: offer.driver.driverProfile?.ratingAvg,
      ratingCount: offer.driver.driverProfile?.ratingCount,
      yearsOfExperience: offer.driver.driverProfile?.yearsOfExperience,
      completedTripsCount: offer.driver.driverProfile?.completedTripsCount,
      languagesSpoken: offer.driver.driverProfile?.languagesSpoken,
      avgResponseTimeMinutes: offer.driver.driverProfile?.avgResponseTimeMinutes,
    },
    vehicle: offer.vehicle
      ? {
          id: offer.vehicle.id,
          make: offer.vehicle.make,
          model: offer.vehicle.model,
          year: offer.vehicle.year,
          photoUrls: offer.vehicle.photoUrls,
          ratingAvg: offer.vehicle.ratingAvg,
          ratingCount: offer.vehicle.ratingCount,
          className: localizeVehicleClass(offer.vehicle.vehicleClass, locale).name,
        }
      : null,
  }));

  return (
    <section className="section fade-up">
      <div className="container">
        <div style={{ marginBottom: "1.5rem" }}>
          <span className="badge">{TRIP_STATUS_LABELS[trip.status]}</span>
          <h1
            className="font-display"
            style={{ fontSize: "clamp(1.7rem, 4vw, 2.35rem)", marginTop: "0.75rem" }}
          >
            {trip.pickupAddress}
            <span className="muted"> → </span>
            {trip.dropoffAddress}
          </h1>
          <p className="muted">
            {format(trip.pickupAt, "EEEE, d MMMM yyyy · HH:mm", { locale: pt })}
          </p>
        </div>

        <JourneyTracker status={trip.status} offerCount={trip.offers.length} />

        <div className="summary-strip" style={{ marginBottom: "1rem" }}>
          <div className="summary-item">
            <div className="label-sm">Distância</div>
            <strong>{formatDistance(trip.distanceMeters)}</strong>
          </div>
          <div className="summary-item">
            <div className="label-sm">Duração</div>
            <strong>{formatDuration(trip.durationSeconds)}</strong>
          </div>
          <div className="summary-item">
            <div className="label-sm">Passageiros</div>
            <strong>
              {trip.passengers} · {trip.luggage} malas
            </strong>
          </div>
        </div>

        <TripRouteMap
          pickupAddress={trip.pickupAddress}
          dropoffAddress={trip.dropoffAddress}
          pickupLat={trip.pickupLat}
          pickupLng={trip.pickupLng}
          dropoffLat={trip.dropoffLat}
          dropoffLng={trip.dropoffLng}
        />

        <div className="grid-2" style={{ marginTop: "1.5rem" }}>
          <div>
            <div className="panel">
              {trip.flightNumber && <p className="muted">Voo {trip.flightNumber}</p>}
              {trip.preferredVehicleClass && (
                <p className="muted">
                  Preferência: {localizeVehicleClass(trip.preferredVehicleClass, locale).name}
                </p>
              )}
              {trip.notes && <p style={{ marginTop: "0.75rem" }}>{trip.notes}</p>}
              {revealContacts && (
                <div className="alert alert-info" style={{ marginTop: "1rem", marginBottom: 0 }}>
                  Contacto disponível:{" "}
                  {isOwner
                    ? trip.offers.find((o) => o.id === trip.acceptedOfferId)?.driver.phone || "—"
                    : trip.customer.phone || "—"}
                </div>
              )}
              {!revealContacts && trip.booking && (
                <div className="alert alert-info" style={{ marginTop: "1rem", marginBottom: 0 }}>
                  Os contactos ficam visíveis depois do pagamento confirmado.
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
                isCustomer={isOwner}
              />
            )}

            {isOwner && trip.status === "COMPLETED" && trip.booking && !trip.booking.review && (
              <ReviewForm bookingId={trip.booking.id} />
            )}
            {(isOwner || isAdmin) && trip.booking?.review && (
              <div className="panel" style={{ marginTop: "1rem" }}>
                <strong>{isOwner ? "A sua avaliação" : "Avaliação"}:</strong>
                <div style={{ marginTop: "0.5rem" }}>
                  Motorista ★ {trip.booking.review.rating}
                  {trip.booking.review.vehicleRating != null
                    ? ` · Veículo ★ ${trip.booking.review.vehicleRating}`
                    : ""}
                </div>
                {trip.booking.review.comment ? (
                  <p className="muted" style={{ marginBottom: 0 }}>
                    {trip.booking.review.comment}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <div>
            {(isOwner || isAdmin) && trip.status === "OPEN" && (
              <>
                {trip.offers.length === 0 ? (
                  <EmptyState
                    title="À procura de motoristas"
                    body="Assim que motoristas verificados responderem, as propostas aparecem aqui."
                  />
                ) : (
                  <OfferCards
                    tripId={trip.id}
                    offers={offerCards}
                    canAccept={isOwner}
                  />
                )}
              </>
            )}

            {(isOwner || isAdmin) && trip.status !== "OPEN" && trip.offers.length > 0 && (
              <div className="panel">
                <h2 className="font-display" style={{ marginTop: 0, fontSize: "1.25rem" }}>
                  Propostas
                </h2>
                <div className="list-stack" style={{ marginTop: "0.75rem" }}>
                  {trip.offers.map((offer) => (
                    <div key={offer.id} className="list-item">
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                        <strong>{formatMoney(offer.priceAmount, offer.currency)}</strong>
                        <span className="badge">{OFFER_STATUS_LABELS[offer.status]}</span>
                      </div>
                      <div>
                        {offer.driver.driverProfile ? (
                          <Link href={`/motoristas/${offer.driver.driverProfile.id}`}>
                            {offer.driver.name}
                          </Link>
                        ) : (
                          offer.driver.name
                        )}
                      </div>
                      {offer.vehicle && (
                        <div className="muted">
                          <Link href={`/veiculos/${offer.vehicle.id}`}>
                            {offer.vehicle.make} {offer.vehicle.model}
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {isOwner && trip.status === "CONFIRMED" && (
                  <Link
                    href={`/pedidos/${trip.id}/confirmacao`}
                    className="btn btn-ghost"
                    style={{ marginTop: "0.75rem" }}
                  >
                    Ver confirmação
                  </Link>
                )}
              </div>
            )}

            {isDriver && trip.status === "OPEN" && (
              <>
                <h2 className="font-display">A sua proposta</h2>
                {myOffer && (
                  <div className="alert alert-info">
                    Proposta atual: {formatMoney(myOffer.priceAmount)} (
                    {OFFER_STATUS_LABELS[myOffer.status]})
                    {myOffer.estimatedArrivalMinutes
                      ? ` · ETA ${myOffer.estimatedArrivalMinutes} min`
                      : ""}
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
                  existingEta={myOffer?.estimatedArrivalMinutes}
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
      </div>
    </section>
  );
}
