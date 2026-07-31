import { prisma } from "@/lib/db";
import { VEHICLE_CLASSES } from "../../prisma/demo-catalog";

/**
 * Create VehicleClass when migrate history drifted on shared Neon and the
 * relation is missing. Seeds the canonical Comfort / Premium / Van catalog.
 */
export async function repairVehicleClassSchema(): Promise<{
  status: "ok" | "repaired" | "failed";
  count: number;
  detail?: string;
}> {
  try {
    const count = await prisma.vehicleClass.count();
    if (count === 0) {
      await prisma.vehicleClass.createMany({
        data: VEHICLE_CLASSES.map((row) => ({ ...row, active: true })),
        skipDuplicates: true,
      });
      return { status: "repaired", count: await prisma.vehicleClass.count() };
    }
    return { status: "ok", count };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/does not exist|P2021/i.test(message)) {
      return { status: "failed", count: 0, detail: message.slice(0, 180) };
    }
  }

  // Table missing — create with DDL matching prisma migration (no db push).
  // Shared Neon often has foreign apps' enums/tables that make `db push` fail.
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "VehicleClass" (
      "id" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "namePt" TEXT NOT NULL,
      "nameEn" TEXT NOT NULL,
      "descriptionPt" TEXT,
      "descriptionEn" TEXT,
      "minPassengers" INTEGER NOT NULL DEFAULT 1,
      "maxPassengers" INTEGER NOT NULL,
      "maxLuggage" INTEGER NOT NULL DEFAULT 2,
      "iconKey" TEXT,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "VehicleClass_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "VehicleClass_code_key" ON "VehicleClass"("code")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "VehicleClass_active_sortOrder_idx" ON "VehicleClass"("active", "sortOrder")`,
  );

  await prisma.vehicleClass.createMany({
    data: VEHICLE_CLASSES.map((row) => ({ ...row, active: true })),
    skipDuplicates: true,
  });

  const count = await prisma.vehicleClass.count();
  return { status: "repaired", count };
}
