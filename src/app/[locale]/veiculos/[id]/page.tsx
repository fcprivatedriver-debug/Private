import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { localizeVehicleClass } from "@/domain/vehicle-class";
import { getLocale } from "next-intl/server";

type Props = { params: Promise<{ id: string }> };

export default async function VehicleProfilePage({ params }: Props) {
  const { id } = await params;
  const locale = await getLocale();

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      vehicleClass: true,
      driver: {
        include: { user: { select: { name: true, image: true } } },
      },
    },
  });

  if (!vehicle) notFound();

  const photos = (() => {
    try {
      const parsed = JSON.parse(vehicle.photoUrls);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  })() as string[];

  const hero =
    photos[0] ||
    "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1600&q=80";

  return (
    <section className="section fade-up">
      <div className="container" style={{ maxWidth: 860 }}>
        <p className="muted" style={{ marginBottom: "1rem" }}>
          <Link href={`/motoristas/${vehicle.driver.id}`}>← {vehicle.driver.user.name}</Link>
        </p>

        <div
          style={{
            borderRadius: "var(--radius-xl)",
            overflow: "hidden",
            marginBottom: "1.5rem",
            aspectRatio: "16 / 9",
            background: "var(--bg-soft)",
            boxShadow: "var(--shadow-lift)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hero} alt={`${vehicle.make} ${vehicle.model}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>

        <span className="badge">{localizeVehicleClass(vehicle.vehicleClass, locale).name}</span>
        <h1 className="page-title" style={{ marginTop: "0.65rem" }}>
          {vehicle.make} {vehicle.model}
        </h1>
        <p className="page-lead">
          {vehicle.year} · {vehicle.color} · matrícula {vehicle.plate}
        </p>

        <div className="summary-strip">
          <div className="summary-item">
            <div className="label-sm">Lugares</div>
            <strong>{vehicle.seats}</strong>
          </div>
          <div className="summary-item">
            <div className="label-sm">Malas</div>
            <strong>{vehicle.luggageCapacity}</strong>
          </div>
          <div className="summary-item">
            <div className="label-sm">Avaliação</div>
            <strong>
              {vehicle.ratingAvg != null ? `★ ${vehicle.ratingAvg.toFixed(1)}` : "—"}
            </strong>
          </div>
        </div>

        <div className="panel">
          <div className="muted">Conduzido por</div>
          <h2 className="font-display" style={{ margin: "0.35rem 0", fontSize: "1.35rem" }}>
            {vehicle.driver.user.name}
          </h2>
          <div className="profile-meta">
            {vehicle.driver.ratingAvg != null && (
              <span>
                ★ {vehicle.driver.ratingAvg.toFixed(1)} · {vehicle.driver.ratingCount} avaliações
              </span>
            )}
            <span>{vehicle.driver.completedTripsCount} viagens</span>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <Link href={`/motoristas/${vehicle.driver.id}`} className="btn btn-secondary btn-sm">
              Ver motorista
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
