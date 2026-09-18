import { prisma } from "@/lib/db";
import { VEHICLE_CLASSES } from "../../prisma/demo-catalog";

/**
 * Non-destructive column repair for shared Neon drift.
 * Does NOT drop data or recreate tables.
 */
export async function repairCustomerProfileColumns(): Promise<{
  ok: boolean;
  detail?: string;
}> {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "CustomerProfile" ADD COLUMN IF NOT EXISTS "defaultCurrency" TEXT NOT NULL DEFAULT 'EUR'`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "CustomerProfile" ADD COLUMN IF NOT EXISTS "ratingAvg" DOUBLE PRECISION`,
    );
    // Shared Neon drift: updatedAt/createdAt exist as NOT NULL without defaults,
    // while Prisma schema omits them — inserts then fail.
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "CustomerProfile" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "CustomerProfile" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "CustomerProfile" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "CustomerProfile" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    return { ok: true };
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 200) : String(error);
    return { ok: false, detail };
  }
}

/** Ensure DriverProfile has columns expected by Prisma (TEXT enums for drift safety). */
export async function repairDriverProfileColumns(): Promise<{
  ok: boolean;
  detail?: string;
}> {
  try {
    const cols: Array<[string, string]> = [
      ["status", `TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION'`],
      ["onboardingStatus", `TEXT NOT NULL DEFAULT 'NOT_STARTED'`],
      ["onboardingStep", `TEXT NOT NULL DEFAULT 'profile'`],
      ["completenessScore", `INTEGER NOT NULL DEFAULT 0`],
      ["photoUrl", `TEXT`],
      ["bio", `TEXT`],
      ["languagesSpoken", `TEXT NOT NULL DEFAULT '["pt"]'`],
      ["yearsOfExperience", `INTEGER NOT NULL DEFAULT 0`],
      ["ratingAvg", `DOUBLE PRECISION`],
      ["ratingCount", `INTEGER NOT NULL DEFAULT 0`],
      ["completedTripsCount", `INTEGER NOT NULL DEFAULT 0`],
      ["responseRate", `DOUBLE PRECISION`],
      ["avgResponseTimeMinutes", `DOUBLE PRECISION`],
      ["documents", `TEXT NOT NULL DEFAULT '[]'`],
      ["aiRiskScore", `DOUBLE PRECISION`],
      ["aiConfidence", `DOUBLE PRECISION`],
      ["aiSummary", `TEXT`],
      ["adminNotes", `TEXT`],
      ["rejectionReason", `TEXT`],
      ["infoRequestMessage", `TEXT`],
      ["submittedAt", `TIMESTAMP(3)`],
      ["verifiedAt", `TIMESTAMP(3)`],
      ["createdAt", `TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`],
      ["updatedAt", `TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`],
    ];
    for (const [column, ddl] of cols) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "${column}" ${ddl}`,
      );
    }
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "DriverProfile" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "DriverProfile" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    return { ok: true };
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 200) : String(error);
    return { ok: false, detail };
  }
}

/**
 * Create VehicleClass when migrate history drifted on shared Neon and the
 * relation is missing. Seeds the canonical Comfort / Premium / Van catalog.
 *
 * PrismaNeonHttp does not support transactions (`createMany` fails with
 * "Transactions are not supported in HTTP mode"). Prefer raw INSERT and
 * single-row writes.
 */
export async function repairVehicleClassSchema(): Promise<{
  status: "ok" | "repaired" | "failed";
  count: number;
  detail?: string;
}> {
  try {
    const count = await prisma.vehicleClass.count();
    if (count > 0) {
      return { status: "ok", count };
    }
    await seedVehicleClassesRaw();
    return { status: "repaired", count: await prisma.vehicleClass.count() };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/does not exist|P2021/i.test(message)) {
      // Table may exist but be empty and seed failed — try DDL path only if missing
      if (/Transactions are not supported/i.test(message)) {
        try {
          await seedVehicleClassesRaw();
          return { status: "repaired", count: await prisma.vehicleClass.count() };
        } catch (seedError) {
          const detail =
            seedError instanceof Error ? seedError.message.slice(0, 180) : String(seedError);
          return { status: "failed", count: 0, detail };
        }
      }
      return { status: "failed", count: 0, detail: message.slice(0, 180) };
    }
  }

  try {
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

    await seedVehicleClassesRaw();
    const count = await prisma.vehicleClass.count();
    return { status: "repaired", count };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: "failed", count: 0, detail: message.slice(0, 180) };
  }
}

function sqlString(value: string | null | undefined): string {
  if (value == null) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function seedVehicleClassesRaw() {
  for (const row of VEHICLE_CLASSES) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "VehicleClass" (
        "id","code","namePt","nameEn","descriptionPt","descriptionEn",
        "minPassengers","maxPassengers","maxLuggage","iconKey","sortOrder",
        "active","createdAt","updatedAt"
      ) VALUES (
        ${sqlString(row.id)},
        ${sqlString(row.code)},
        ${sqlString(row.namePt)},
        ${sqlString(row.nameEn)},
        ${sqlString(row.descriptionPt)},
        ${sqlString(row.descriptionEn)},
        ${row.minPassengers},
        ${row.maxPassengers},
        ${row.maxLuggage},
        ${sqlString(row.iconKey)},
        ${row.sortOrder},
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("code") DO UPDATE SET
        "namePt" = EXCLUDED."namePt",
        "nameEn" = EXCLUDED."nameEn",
        "descriptionPt" = EXCLUDED."descriptionPt",
        "descriptionEn" = EXCLUDED."descriptionEn",
        "minPassengers" = EXCLUDED."minPassengers",
        "maxPassengers" = EXCLUDED."maxPassengers",
        "maxLuggage" = EXCLUDED."maxLuggage",
        "iconKey" = EXCLUDED."iconKey",
        "sortOrder" = EXCLUDED."sortOrder",
        "active" = true,
        "updatedAt" = CURRENT_TIMESTAMP
    `);
  }
}
