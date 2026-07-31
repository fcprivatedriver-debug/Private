import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { VehicleClassAdminPanel } from "@/components/admin/VehicleClassAdminPanel";
import { Link } from "@/i18n/navigation";
import { repairVehicleClassSchema } from "@/lib/db-repair";

export default async function AdminVehicleClassesPage() {
  await requireRole("ADMIN");

  let classes;
  try {
    classes = await prisma.vehicleClass.findMany({
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    });
    if (classes.length === 0) {
      await repairVehicleClassSchema();
      classes = await prisma.vehicleClass.findMany({
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/does not exist|P2021/i.test(message)) {
      await repairVehicleClassSchema();
      classes = await prisma.vehicleClass.findMany({
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      });
    } else {
      throw error;
    }
  }

  return (
    <section className="section fade-up">
      <div className="container">
        <p className="muted">
          <Link href="/admin">← Admin</Link>
        </p>
        <h1 className="page-title">
          Vehicle classes
        </h1>
        <p className="lead">
          Database-driven classification used by vehicles, trip preferences and commission rules.
        </p>
        <VehicleClassAdminPanel classes={classes} />
      </div>
    </section>
  );
}
