import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { DRIVER_STATUS_LABELS } from "@/config/constants";
import { localizeVehicleClass } from "@/domain/vehicle-class";
import { getLocale } from "next-intl/server";

type Props = { params: Promise<{ id: string; locale: string }> };

export default async function DriverProfilePage({ params }: Props) {
  const { id } = await params;
  const locale = await getLocale();

  const profile = await prisma.driverProfile.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, image: true, locale: true } },
      vehicles: { include: { vehicleClass: true } },
      verificationReviews: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!profile) notFound();

  const vehicle = profile.vehicles[0];
  const languages = (() => {
    try {
      const parsed = JSON.parse(profile.languagesSpoken);
      return Array.isArray(parsed) ? parsed.join(" · ").toUpperCase() : profile.languagesSpoken;
    } catch {
      return profile.languagesSpoken;
    }
  })();

  return (
    <section className="section fade-up">
      <div className="container" style={{ maxWidth: 820 }}>
        <p className="muted" style={{ marginBottom: "1rem" }}>
          <Link href="/">← Movio</Link>
        </p>

        <div className="profile-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="profile-avatar"
            src={
              profile.photoUrl ||
              profile.user.image ||
              "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop"
            }
            alt={profile.user.name}
          />
          <div>
            <span className="badge">{DRIVER_STATUS_LABELS[profile.status]}</span>
            <h1 className="page-title" style={{ marginTop: "0.55rem" }}>
              {profile.user.name}
            </h1>
            <p className="page-lead" style={{ marginBottom: "0.75rem" }}>
              {profile.bio || "Motorista privado na Movio."}
            </p>
            <div className="profile-meta">
              {profile.ratingAvg != null && (
                <span className="quality-pill">
                  <strong>★ {profile.ratingAvg.toFixed(1)}</strong>
                  <span>({profile.ratingCount} avaliações)</span>
                </span>
              )}
              <span>{profile.yearsOfExperience} anos de experiência</span>
              <span>{profile.completedTripsCount} viagens</span>
              {profile.responseRate != null && <span>{Math.round(profile.responseRate)}% resposta</span>}
            </div>
            <div className="trust-row">
              <span className="badge badge-success">Verificado Movio</span>
              {languages && <span className="badge badge-neutral">{languages}</span>}
            </div>
          </div>
        </div>

        {vehicle && (
          <div className="panel panel-lift">
            <div className="muted" style={{ marginBottom: "0.35rem" }}>
              Veículo
            </div>
            <h2 className="font-display" style={{ margin: "0 0 0.35rem", fontSize: "1.45rem" }}>
              {vehicle.make} {vehicle.model}
            </h2>
            <p className="muted" style={{ marginTop: 0 }}>
              {localizeVehicleClass(vehicle.vehicleClass, locale).name} · {vehicle.year} ·{" "}
              {vehicle.color} · {vehicle.seats} lugares · {vehicle.luggageCapacity} malas
              {vehicle.ratingCount ? ` · ★ ${vehicle.ratingAvg?.toFixed(1)}` : ""}
            </p>
            <Link href={`/veiculos/${vehicle.id}`} className="btn btn-secondary btn-sm">
              Ver veículo
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
