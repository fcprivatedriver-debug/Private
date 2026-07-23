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
        <h1 className="font-display" style={{ fontSize: "2.4rem" }}>
          O teu veículo
        </h1>
        <p className="muted" style={{ marginBottom: "1.25rem" }}>
          Estado do perfil:{" "}
          <span className="badge">
            {profile ? DRIVER_STATUS_LABELS[profile.status] : "—"}
          </span>
        </p>
        <VehicleForm vehicle={profile?.vehicles[0] || null} />
      </div>
    </section>
  );
}
