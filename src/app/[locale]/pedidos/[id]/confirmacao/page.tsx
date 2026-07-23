import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { TripRouteMap } from "@/components/map/TripRouteMap";
import { formatDistance, formatDuration } from "@/lib/maps/route";
import { bookingReference } from "@/config/constants";
import { formatMoney } from "@/lib/money";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Link } from "@/i18n/navigation";
import { localizeVehicleClass } from "@/domain/vehicle-class";
import { getLocale } from "next-intl/server";

type Props = { params: Promise<{ id: string }> };

export default async function ConfirmationPage({ params }: Props) {
  const session = await requireSession();
  const { id } = await params;
  const locale = await getLocale();

  const trip = await prisma.tripRequest.findUnique({
    where: { id },
    include: {
      booking: {
        include: {
          payment: true,
          offer: {
            include: {
              vehicle: { include: { vehicleClass: true } },
              driver: { include: { driverProfile: true } },
            },
          },
        },
      },
    },
  });

  if (!trip || trip.customerId !== session.user.id) notFound();
  if (!trip.booking) redirect(`/pedidos/${id}`);

  const paid =
    trip.booking.status === "PAID" ||
    trip.booking.status === "COMPLETED" ||
    trip.booking.payment?.status === "CAPTURED" ||
    ["CONFIRMED", "DRIVER_EN_ROUTE", "DRIVER_ARRIVED", "IN_PROGRESS", "COMPLETED"].includes(
      trip.status,
    );

  if (!paid) redirect(`/pedidos/${id}/pagamento`);

  const offer = trip.booking.offer;
  const driver = offer.driver;
  const profile = driver.driverProfile;
  const vehicle = offer.vehicle;
  const ref = bookingReference(trip.booking.id);
  const driverPhoto =
    profile?.photoUrl ||
    driver.image ||
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop";

  let vehiclePhoto: string | null = null;
  if (vehicle?.photoUrls) {
    try {
      const parsed = JSON.parse(vehicle.photoUrls);
      if (Array.isArray(parsed) && parsed[0]) vehiclePhoto = String(parsed[0]);
    } catch {
      /* ignore */
    }
  }
  if (!vehiclePhoto) {
    vehiclePhoto =
      "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=400&h=300&fit=crop";
  }

  return (
    <section className="section fade-up">
      <div className="container" style={{ maxWidth: 880 }}>
        <p className="eyebrow">Reserva confirmada</p>
        <h1 className="page-title">Tudo pronto para a sua viagem</h1>
        <p className="page-lead">
          Referência <strong>{ref}</strong> · Total{" "}
          {formatMoney(trip.booking.totalAmount, trip.booking.currency)}
        </p>

        <div className="summary-strip" style={{ margin: "1.25rem 0" }}>
          <div className="summary-item">
            <div className="label-sm">Data</div>
            <strong>{format(trip.pickupAt, "d MMM yyyy", { locale: pt })}</strong>
          </div>
          <div className="summary-item">
            <div className="label-sm">Hora</div>
            <strong>{format(trip.pickupAt, "HH:mm")}</strong>
          </div>
          <div className="summary-item">
            <div className="label-sm">Chegada estimada</div>
            <strong>
              {offer.estimatedArrivalMinutes != null
                ? `~${offer.estimatedArrivalMinutes} min`
                : "—"}
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
          <div className="panel">
            <div className="label-sm">Motorista</div>
            <div style={{ display: "flex", gap: "0.85rem", marginTop: "0.65rem" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={driverPhoto}
                alt={driver.name || "Motorista"}
                style={{ width: 72, height: 72, borderRadius: 14, objectFit: "cover" }}
              />
              <div>
                <strong style={{ fontSize: "1.1rem" }}>{driver.name}</strong>
                {profile?.ratingAvg != null && (
                  <div className="muted">★ {profile.ratingAvg.toFixed(1)}</div>
                )}
                {profile && (
                  <Link href={`/motoristas/${profile.id}`} className="btn btn-ghost btn-sm">
                    Ver perfil
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="label-sm">Veículo</div>
            {vehicle ? (
              <div style={{ display: "flex", gap: "0.85rem", marginTop: "0.65rem" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={vehiclePhoto}
                  alt={`${vehicle.make} ${vehicle.model}`}
                  style={{ width: 96, height: 64, borderRadius: 10, objectFit: "cover" }}
                />
                <div>
                  <strong>
                    {vehicle.make} {vehicle.model}
                  </strong>
                  <div className="muted">
                    {localizeVehicleClass(vehicle.vehicleClass, locale).name} · {vehicle.year}
                  </div>
                  <Link href={`/veiculos/${vehicle.id}`} className="btn btn-ghost btn-sm">
                    Ver veículo
                  </Link>
                </div>
              </div>
            ) : (
              <p className="muted">Veículo a confirmar</p>
            )}
          </div>
        </div>

        <div className="panel" style={{ marginTop: "1rem" }}>
          <div className="label-sm">Pickup</div>
          <p style={{ margin: "0.25rem 0 0.85rem", fontWeight: 600 }}>{trip.pickupAddress}</p>
          <div className="label-sm">Destino</div>
          <p style={{ margin: "0.25rem 0 0.85rem", fontWeight: 600 }}>{trip.dropoffAddress}</p>
          <div className="summary-strip">
            <div className="summary-item">
              <div className="label-sm">Distância</div>
              <strong>{formatDistance(trip.distanceMeters)}</strong>
            </div>
            <div className="summary-item">
              <div className="label-sm">Duração</div>
              <strong>{formatDuration(trip.durationSeconds)}</strong>
            </div>
            <div className="summary-item">
              <div className="label-sm">Referência</div>
              <strong>{ref}</strong>
            </div>
          </div>
        </div>

        <div className="cta-row" style={{ marginTop: "1.5rem" }}>
          <Link href={`/pedidos/${trip.id}`} className="btn btn-primary">
            Acompanhar viagem
          </Link>
          <Link href="/pedidos" className="btn btn-ghost">
            Os meus pedidos
          </Link>
        </div>
      </div>
    </section>
  );
}
