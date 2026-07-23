import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { VehicleForm } from "@/components/driver/VehicleForm";
import { DRIVER_STATUS_LABELS } from "@/config/constants";

export default async function VehiclePage() {
  const session = await requireRole("DRIVER");
  const profile = await prisma.driverProfile.findUnique({
    where: { userId: session.user.id },
    include: { vehicles: true },
  });

  return (
    <section className="section fade-up">
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 className="page-title">
          O teu veículo
        </h1>
        <p className="muted" style={{ marginBottom: "1.25rem" }}>
          Estado do perfil:{" "}
          <span className="badge">
            {profile ? DRIVER_STATUS_LABELS[profile.status] : "—"}
          </span>
        </p>
        <VehicleForm
          vehicle={
            profile?.vehicles[0]
              ? {
                  make: profile.vehicles[0].make,
                  model: profile.vehicles[0].model,
                  year: profile.vehicles[0].year,
                  color: profile.vehicles[0].color,
                  plate: profile.vehicles[0].plate,
                  seats: profile.vehicles[0].seats,
                  luggageCapacity: profile.vehicles[0].luggageCapacity,
                  vehicleClassId: profile.vehicles[0].vehicleClassId,
                }
              : null
          }
        />
      </div>
    </section>
  );
}
