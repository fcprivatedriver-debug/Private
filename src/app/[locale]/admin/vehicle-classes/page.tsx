import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { VehicleClassAdminPanel } from "@/components/admin/VehicleClassAdminPanel";
import { Link } from "@/i18n/navigation";

export default async function AdminVehicleClassesPage() {
  await requireRole("ADMIN");
  const classes = await prisma.vehicleClass.findMany({
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });

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
