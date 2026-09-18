import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { TRIP_STATUS_LABELS, OFFER_STATUS_LABELS } from "@/config/constants";
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
import { shortLocationLabel, shortRouteLabel, publicFirstName } from "@/lib/location-label";

type Props = { params: Promise<{ id: string }> };

export default async function TripDetailPage({ params }: Props) {
  const session = await requireSession();
  const { id } = await params;
  const locale = await getLocale();

  const isAdmin = session.user.role === "ADMIN";
  const hasDriver = Boolean(session.user.hasDriver || session.user.role === "DRIVER");

  // Explicit select — never pull customer email/phone into the RSC payload for drivers
  // until contacts are revealed server-side.
  const trip = await prisma.tripRequest.findUnique({
    where: { id },
    include: {
      offers: {
        include: {
          driver: {
            select: {
              id: true,
              name: true,
              image: true,
              driverProfile: {
                select: {
                  id: true,
                  photoUrl: true,
                  ratingAvg: true,
                  ratingCount: true,
                  yearsOfExperience: true,
                  completedTripsCount: true,
                  languagesSpoken: true,
                  avgResponseTimeMinutes: true,
                  status: true,
                },
              },
            },
          },
          vehicle: { include: { vehicleClass: true } },
        },
        orderBy: { priceAmount: "asc" },
      },
      booking: { include: { payment: true, review: true } },
      customer: { select: { id: true, name: true } },
      preferredVehicleClass: true,
    },
  });

  if (!trip) notFound();

  const isOwner = trip.customerId === session.user.id;
  const isAssignedDriver = trip.booking?.driverId === session.user.id;
  const actingAsDriver = hasDriver && !isOwner;
  const canViewAsDriver = hasDriver && (trip.status === "OPEN" || isAssignedDriver || isAdmin);

  if (!isOwner && !canViewAsDriver && !isAdmin) notFound();

  // Fetch contacts only when reveal is allowed — never embed then hide
  let revealContacts = false;
  let revealedPhone: string | null = null;
  if (trip.booking) {
    revealContacts = canRevealContacts({
      viewerId: session.user.id,
      customerId: trip.customerId,
      driverId: trip.booking.driverId,
      bookingStatus: trip.booking.status,
      paymentStatus: trip.booking.payment?.status,
      isAdmin,
    });
    if (revealContacts) {
      if (isOwner) {
        const accepted = trip.offers.find((o) => o.id === trip.acceptedOfferId);
        if (accepted) {
          const driverUser = await prisma.user.findUnique({
            where: { id: accepted.driverId },
            select: { phone: true },
          });
          revealedPhone = driverUser?.phone ?? null;
        }
      } else if (isAssignedDriver || isAdmin) {
        const customer = await prisma.user.findUnique({
          where: { id: trip.customerId },
          select: { phone: true },
        });
        revealedPhone = customer?.phone ?? null;
      }
    }
  }

  const canManageJourney = Boolean(isOwner || isAssignedDriver || isAdmin);

  const driverVehicles =
    actingAsDriver || (hasDriver && isOwner)
      ? await prisma.driverProfile.findUnique({
          where: { userId: session.user.id },
          include: {
            vehicles: { include: { vehicleClass: true } },
            verificationDocs: { select: { id: true } },
          },
        })
      : null;

  const myOffer = trip.offers.find((o) => o.driverId === session.user.id);
  const driverCanPropose =
    actingAsDriver &&
    trip.status === "OPEN" &&
    driverVehicles?.status === "ACTIVE";

  const offerCards = (isOwner || isAdmin ? trip.offers : []).map((offer) => ({
    id: offer.id,
    priceAmount: offer.priceAmount,
    currency: offer.currency,
    message: offer.message,
    estimatedArrivalMinutes: offer.estimatedArrivalMinutes,
    createdAt: offer.createdAt,
    driver: {
      id: offer.driver.id,
      name: publicFirstName(offer.driver.name),
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

  const routeShort = shortRouteLabel(trip.pickupAddress, trip.dropoffAddress);

  return (
    <section className="section fade-up">
      <div className="container" style={{ maxWidth: 860 }}>
        <p className="muted" style={{ marginBottom: "0.75rem" }}>
          {actingAsDriver ? (
            <Link href="/pedidos-abertos">← Pedidos</Link>
          ) : (
            <Link href="/pedidos">← As minhas viagens</Link>
          )}
        </p>

        <div style={{ marginBottom: "1.25rem" }}>
          <span className="badge">
            {trip.status === "OPEN" && trip.offers.length > 0 && (isOwner || isAdmin)
              ? `${trip.offers.length} proposta${trip.offers.length === 1 ? "" : "s"}`
              : TRIP_STATUS_LABELS[trip.status]}
          </span>
          <h1
            className="font-display"
            style={{ fontSize: "clamp(1.45rem, 4vw, 2rem)", marginTop: "0.65rem" }}
          >
            {routeShort}
          </h1>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            {format(trip.pickupAt, "EEEE, d MMMM yyyy · HH:mm", { locale: pt })}
          </p>
        </div>

        {(isOwner || isAdmin) && (
          <JourneyTracker status={trip.status} offerCount={trip.offers.length} />
        )}

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
              {trip.passengers} · {trip.luggage} mala{trip.luggage === 1 ? "" : "s"}
            </strong>
          </div>
        </div>

        <div className="panel" style={{ marginBottom: "1rem" }}>
          <div className="trip-detail-addresses">
            <div>
              <div className="label-sm">Origem</div>
              <strong>{shortLocationLabel(trip.pickupAddress, 48)}</strong>
              <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.88rem" }}>
                {trip.pickupAddress}
              </p>
            </div>
            <div className="trip-card-arrow" aria-hidden>
              ↓
            </div>
            <div>
              <div className="label-sm">Destino</div>
              <strong>{shortLocationLabel(trip.dropoffAddress, 48)}</strong>
              <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.88rem" }}>
                {trip.dropoffAddress}
              </p>
            </div>
          </div>
          {trip.flightNumber && <p className="muted">Voo {trip.flightNumber}</p>}
          {trip.preferredVehicleClass && (
            <p className="muted">
              Categoria: {localizeVehicleClass(trip.preferredVehicleClass, locale).name}
            </p>
          )}
          {trip.notes && (
            <p style={{ marginTop: "0.75rem" }}>
              <strong>Observações:</strong> {trip.notes}
            </p>
          )}
          {revealContacts && revealedPhone && (
            <div className="alert alert-info" style={{ marginTop: "1rem", marginBottom: 0 }}>
              Contacto: {revealedPhone}
            </div>
          )}
          {!revealContacts && trip.booking && (
            <div className="alert alert-info" style={{ marginTop: "1rem", marginBottom: 0 }}>
              Os contactos ficam visíveis depois do pagamento confirmado.
            </div>
          )}
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
                  <OfferCards tripId={trip.id} offers={offerCards} canAccept={isOwner} />
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
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "0.75rem",
                        }}
                      >
                        <strong>{formatMoney(offer.priceAmount, offer.currency)}</strong>
                        <span className="badge">{OFFER_STATUS_LABELS[offer.status]}</span>
                      </div>
                      <div>
                        {offer.driver.driverProfile ? (
                          <Link href={`/motoristas/${offer.driver.driverProfile.id}`}>
                            {publicFirstName(offer.driver.name)}
                          </Link>
                        ) : (
                          publicFirstName(offer.driver.name)
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

            {actingAsDriver && trip.status === "OPEN" && (
              <>
                {myOffer ? (
                  <div className="panel">
                    <h2 className="font-display" style={{ fontSize: "1.25rem", marginTop: 0 }}>
                      A minha proposta
                    </h2>
                    <p>
                      {formatMoney(myOffer.priceAmount)} · {OFFER_STATUS_LABELS[myOffer.status]}
                    </p>
                    <div className="cta-row">
                      <Link href="/propostas" className="btn btn-secondary btn-sm">
                        Ver as minhas propostas
                      </Link>
                    </div>
                    {driverCanPropose && (
                      <OfferForm
                        tripRequestId={trip.id}
                        routeLabel={routeShort}
                        vehicles={(driverVehicles?.vehicles || []).map((v) => ({
                          id: v.id,
                          make: v.make,
                          model: v.model,
                          className: localizeVehicleClass(v.vehicleClass, locale).name,
                        }))}
                        existingPrice={myOffer.priceAmount / 100}
                        existingEta={myOffer.estimatedArrivalMinutes}
                      />
                    )}
                  </div>
                ) : driverCanPropose ? (
                  <>
                    <h2 className="font-display" style={{ fontSize: "1.25rem" }}>
                      Fazer proposta
                    </h2>
                    <OfferForm
                      tripRequestId={trip.id}
                      routeLabel={routeShort}
                      vehicles={(driverVehicles?.vehicles || []).map((v) => ({
                        id: v.id,
                        make: v.make,
                        model: v.model,
                        className: localizeVehicleClass(v.vehicleClass, locale).name,
                      }))}
                    />
                  </>
                ) : (
                  <div className="alert alert-info">
                    Complete a verificação de documentos para enviar propostas.{" "}
                    <Link href="/onboarding">Abrir onboarding</Link>
                  </div>
                )}
              </>
            )}

            {actingAsDriver && myOffer && trip.status !== "OPEN" && (
              <div className="panel">
                <h2 className="font-display" style={{ fontSize: "1.25rem", marginTop: 0 }}>
                  Estado da proposta
                </h2>
                <p>
                  {formatMoney(myOffer.priceAmount)} · {OFFER_STATUS_LABELS[myOffer.status]}
                </p>
                <Link href="/propostas" className="btn btn-secondary btn-sm">
                  As minhas propostas
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
