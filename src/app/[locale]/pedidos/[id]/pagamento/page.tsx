import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { TripRouteMap } from "@/components/map/TripRouteMap";
import { formatDistance, formatDuration } from "@/lib/maps/route";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { PaymentCheckout } from "@/components/payment/PaymentCheckout";
import { getPaymentProvider } from "@/lib/payments/provider";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function PaymentPage({ params }: Props) {
  const session = await requireSession();
  const { id } = await params;

  const trip = await prisma.tripRequest.findUnique({
    where: { id },
    include: {
      booking: { include: { payment: true, offer: { include: { vehicle: true, driver: true } } } },
    },
  });

  if (!trip || trip.customerId !== session.user.id) notFound();
  if (!trip.booking) redirect(`/pedidos/${id}`);

  if (
    trip.booking.status === "PAID" ||
    trip.booking.payment?.status === "CAPTURED" ||
    trip.status === "CONFIRMED"
  ) {
    redirect(`/pedidos/${id}/confirmacao`);
  }

  if (trip.booking.status !== "PENDING_PAYMENT") {
    redirect(`/pedidos/${id}`);
  }

  const intent = await getPaymentProvider().createPaymentIntent({
    bookingId: trip.booking.id,
    amount: trip.booking.totalAmount,
    currency: trip.booking.currency,
    customerEmail: session.user.email || "",
    platformFeeAmount: trip.booking.platformFeeAmount,
  });

  const driver = trip.booking.offer.driver;
  const vehicle = trip.booking.offer.vehicle;

  return (
    <section className="section fade-up">
      <div className="container" style={{ maxWidth: 820 }}>
        <p className="eyebrow">Pagamento</p>
        <h1 className="page-title">Confirme a sua viagem</h1>
        <p className="page-lead">
          Revise o trajeto e finalize o pagamento para reservar o motorista.
        </p>

        <div className="grid-2" style={{ marginTop: "1.5rem", alignItems: "start" }}>
          <div>
            <div className="panel" style={{ marginBottom: "1rem" }}>
              <div className="label-sm">Trajeto</div>
              <p style={{ margin: "0.35rem 0 0.75rem", fontWeight: 600 }}>
                {trip.pickupAddress}
                <span className="muted"> → </span>
                {trip.dropoffAddress}
              </p>
              <p className="muted" style={{ marginTop: 0 }}>
                {format(trip.pickupAt, "EEEE, d MMMM yyyy · HH:mm", { locale: pt })}
              </p>
              <div className="summary-strip" style={{ marginTop: "0.85rem" }}>
                <div className="summary-item">
                  <div className="label-sm">Distância</div>
                  <strong>{formatDistance(trip.distanceMeters)}</strong>
                </div>
                <div className="summary-item">
                  <div className="label-sm">Duração</div>
                  <strong>{formatDuration(trip.durationSeconds)}</strong>
                </div>
              </div>
            </div>

            <div className="panel" style={{ marginBottom: "1rem" }}>
              <div className="label-sm">Motorista & veículo</div>
              <p style={{ margin: "0.35rem 0 0", fontWeight: 600 }}>{driver.name}</p>
              {vehicle && (
                <p className="muted" style={{ margin: "0.25rem 0 0" }}>
                  {vehicle.make} {vehicle.model} · {vehicle.year}
                </p>
              )}
              {trip.booking.offer.estimatedArrivalMinutes != null && (
                <p className="muted" style={{ margin: "0.45rem 0 0" }}>
                  Chegada estimada ~{trip.booking.offer.estimatedArrivalMinutes} min
                </p>
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
          </div>

          <div>
            <PaymentCheckout
              bookingId={trip.booking.id}
              tripId={trip.id}
              totalAmount={trip.booking.totalAmount}
              currency={trip.booking.currency}
              stripeReady={intent.status === "created"}
              clientSecret={intent.clientSecret}
            />
            <p style={{ marginTop: "1rem" }}>
              <Link href={`/pedidos/${trip.id}`} className="btn btn-ghost">
                Voltar ao pedido
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
