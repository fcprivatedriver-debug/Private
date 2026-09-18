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

async function ensureEnum(name: string, values: string[]) {
  const list = values.map((v) => `'${v}'`).join(", ");
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "${name}" AS ENUM (${list});
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  for (const value of values) {
    await prisma.$executeRawUnsafe(
      `ALTER TYPE "${name}" ADD VALUE IF NOT EXISTS '${value}'`,
    );
  }
}

/**
 * Ensure marketplace tables exist in public schema (non-destructive).
 * Known Preview failures from shared Neon drift:
 * - TripRequest missing
 * - Vehicle.vehicleClassId / Vehicle.luggageCapacity missing on pre-existing Vehicle table
 */
export async function repairMarketplaceSchema(): Promise<{
  ok: boolean;
  detail?: string;
}> {
  try {
    await ensureEnum("TripStatus", [
      "DRAFT",
      "OPEN",
      "OFFER_ACCEPTED",
      "CONFIRMED",
      "DRIVER_EN_ROUTE",
      "DRIVER_ARRIVED",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
      "EXPIRED",
    ]);
    await ensureEnum("OfferStatus", [
      "PENDING",
      "WITHDRAWN",
      "REJECTED",
      "ACCEPTED",
      "EXPIRED",
    ]);
    await ensureEnum("BookingStatus", [
      "PENDING_PAYMENT",
      "PAID",
      "REFUNDED",
      "CANCELLED",
      "COMPLETED",
    ]);
    await ensureEnum("PaymentProvider", ["STRIPE", "MANUAL", "NONE"]);
    await ensureEnum("PaymentStatus", [
      "REQUIRES_PAYMENT",
      "AUTHORIZED",
      "CAPTURED",
      "FAILED",
      "REFUNDED",
    ]);
    await ensureEnum("DriverStatus", [
      "PENDING_VERIFICATION",
      "ACTIVE",
      "SUSPENDED",
      "REJECTED",
    ]);
    await ensureEnum("OnboardingStatus", [
      "NOT_STARTED",
      "IN_PROGRESS",
      "SUBMITTED",
      "UNDER_REVIEW",
      "NEEDS_INFO",
      "APPROVED",
      "REJECTED",
    ]);
    await ensureEnum("DriverDocumentType", [
      "IDENTITY",
      "DRIVING_LICENSE",
      "VEHICLE_REGISTRATION",
      "INSURANCE",
      "PROFILE_PHOTO",
      "TVDE_CERTIFICATE",
      "CMTVDE_LICENSE",
      "CRIMINAL_RECORD",
      "OTHER",
    ]);
    await ensureEnum("DriverDocumentStatus", [
      "UPLOADED",
      "AI_PROCESSING",
      "AI_PASSED",
      "AI_FLAGGED",
      "APPROVED",
      "REJECTED",
    ]);
    await ensureEnum("VerificationDecision", [
      "APPROVE",
      "REJECT",
      "REQUEST_INFO",
      "ESCALATE",
    ]);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Vehicle" (
        "id" TEXT NOT NULL,
        "driverId" TEXT NOT NULL,
        "vehicleClassId" TEXT NOT NULL,
        "make" TEXT NOT NULL,
        "model" TEXT NOT NULL,
        "year" INTEGER NOT NULL,
        "color" TEXT NOT NULL,
        "plate" TEXT NOT NULL,
        "seats" INTEGER NOT NULL,
        "luggageCapacity" INTEGER NOT NULL DEFAULT 2,
        "photoUrls" TEXT NOT NULL DEFAULT '[]',
        "ratingAvg" DOUBLE PRECISION,
        "ratingCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
      )
    `);
    // Existing shared Neon "Vehicle" tables often predate Prisma fields.
    // CREATE TABLE IF NOT EXISTS does not add missing columns — repair them.
    const vehicleCols: Array<[string, string]> = [
      ["vehicleClassId", `TEXT`],
      ["make", `TEXT`],
      ["model", `TEXT`],
      ["year", `INTEGER`],
      ["color", `TEXT`],
      ["plate", `TEXT`],
      ["seats", `INTEGER NOT NULL DEFAULT 4`],
      ["luggageCapacity", `INTEGER NOT NULL DEFAULT 2`],
      ["photoUrls", `TEXT NOT NULL DEFAULT '[]'`],
      ["ratingAvg", `DOUBLE PRECISION`],
      ["ratingCount", `INTEGER NOT NULL DEFAULT 0`],
      ["createdAt", `TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`],
      ["updatedAt", `TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`],
    ];
    for (const [column, ddl] of vehicleCols) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "${column}" ${ddl}`,
      );
    }
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Vehicle" ALTER COLUMN "luggageCapacity" SET DEFAULT 2`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Vehicle" ALTER COLUMN "seats" SET DEFAULT 4`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Vehicle" ALTER COLUMN "photoUrls" SET DEFAULT '[]'`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Vehicle" ALTER COLUMN "ratingCount" SET DEFAULT 0`,
    );
    await prisma.$executeRawUnsafe(
      `UPDATE "Vehicle" SET "luggageCapacity" = 2 WHERE "luggageCapacity" IS NULL`,
    );
    await prisma.$executeRawUnsafe(
      `UPDATE "Vehicle" SET "seats" = 4 WHERE "seats" IS NULL`,
    );

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "TripRequest" (
        "id" TEXT NOT NULL,
        "customerId" TEXT NOT NULL,
        "pickupAddress" TEXT NOT NULL,
        "pickupLat" DOUBLE PRECISION,
        "pickupLng" DOUBLE PRECISION,
        "dropoffAddress" TEXT NOT NULL,
        "dropoffLat" DOUBLE PRECISION,
        "dropoffLng" DOUBLE PRECISION,
        "pickupAt" TIMESTAMP(3) NOT NULL,
        "passengers" INTEGER NOT NULL DEFAULT 1,
        "luggage" INTEGER NOT NULL DEFAULT 1,
        "notes" TEXT,
        "flightNumber" TEXT,
        "status" "TripStatus" NOT NULL DEFAULT 'DRAFT',
        "preferredVehicleClassId" TEXT,
        "currency" TEXT NOT NULL DEFAULT 'EUR',
        "distanceMeters" INTEGER,
        "durationSeconds" INTEGER,
        "expiresAt" TIMESTAMP(3),
        "acceptedOfferId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TripRequest_pkey" PRIMARY KEY ("id")
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Offer" (
        "id" TEXT NOT NULL,
        "tripRequestId" TEXT NOT NULL,
        "driverId" TEXT NOT NULL,
        "vehicleId" TEXT,
        "priceAmount" INTEGER NOT NULL,
        "currency" TEXT NOT NULL DEFAULT 'EUR',
        "message" TEXT,
        "includesTolls" BOOLEAN NOT NULL DEFAULT true,
        "includesWaiting" BOOLEAN NOT NULL DEFAULT false,
        "estimatedArrivalMinutes" INTEGER,
        "validUntil" TIMESTAMP(3),
        "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Booking" (
        "id" TEXT NOT NULL,
        "tripRequestId" TEXT NOT NULL,
        "offerId" TEXT NOT NULL,
        "customerId" TEXT NOT NULL,
        "driverId" TEXT NOT NULL,
        "status" "BookingStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
        "totalAmount" INTEGER NOT NULL,
        "currency" TEXT NOT NULL DEFAULT 'EUR',
        "platformFeeAmount" INTEGER NOT NULL,
        "paymentIntentId" TEXT,
        "confirmedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Payment" (
        "id" TEXT NOT NULL,
        "bookingId" TEXT NOT NULL,
        "provider" "PaymentProvider" NOT NULL DEFAULT 'NONE',
        "providerPaymentId" TEXT,
        "amount" INTEGER NOT NULL,
        "currency" TEXT NOT NULL DEFAULT 'EUR',
        "status" "PaymentStatus" NOT NULL DEFAULT 'REQUIRES_PAYMENT',
        "rawPayload" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Review" (
        "id" TEXT NOT NULL,
        "bookingId" TEXT NOT NULL,
        "fromUserId" TEXT NOT NULL,
        "toUserId" TEXT NOT NULL,
        "rating" INTEGER NOT NULL,
        "vehicleRating" INTEGER,
        "comment" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Notification" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "body" TEXT NOT NULL,
        "readAt" TIMESTAMP(3),
        "meta" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "DriverDocument" (
        "id" TEXT NOT NULL,
        "driverProfileId" TEXT NOT NULL,
        "type" "DriverDocumentType" NOT NULL,
        "status" "DriverDocumentStatus" NOT NULL DEFAULT 'UPLOADED',
        "fileName" TEXT NOT NULL,
        "mimeType" TEXT NOT NULL,
        "sizeBytes" INTEGER NOT NULL,
        "storageKey" TEXT NOT NULL,
        "url" TEXT,
        "aiAnalysis" TEXT,
        "aiScore" DOUBLE PRECISION,
        "aiFlags" TEXT NOT NULL DEFAULT '[]',
        "reviewerNotes" TEXT,
        "reviewedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "DriverDocument_pkey" PRIMARY KEY ("id")
      )
    `);
    const driverDocCols: Array<[string, string]> = [
      ["driverProfileId", `TEXT`],
      ["type", `TEXT`],
      ["status", `TEXT NOT NULL DEFAULT 'UPLOADED'`],
      ["fileName", `TEXT`],
      ["mimeType", `TEXT`],
      ["sizeBytes", `INTEGER`],
      ["storageKey", `TEXT`],
      ["url", `TEXT`],
      ["aiAnalysis", `TEXT`],
      ["aiScore", `DOUBLE PRECISION`],
      ["aiFlags", `TEXT NOT NULL DEFAULT '[]'`],
      ["reviewerNotes", `TEXT`],
      ["reviewedAt", `TIMESTAMP(3)`],
      ["createdAt", `TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`],
      ["updatedAt", `TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`],
    ];
    for (const [column, ddl] of driverDocCols) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "DriverDocument" ADD COLUMN IF NOT EXISTS "${column}" ${ddl}`,
      );
    }

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "VerificationReview" (
        "id" TEXT NOT NULL,
        "driverProfileId" TEXT NOT NULL,
        "source" TEXT NOT NULL,
        "decision" "VerificationDecision",
        "riskScore" DOUBLE PRECISION,
        "confidence" DOUBLE PRECISION,
        "recommendation" TEXT,
        "findings" TEXT NOT NULL DEFAULT '[]',
        "notes" TEXT,
        "actorUserId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "VerificationReview_pkey" PRIMARY KEY ("id")
      )
    `);
    const verificationCols: Array<[string, string]> = [
      ["driverProfileId", `TEXT`],
      ["source", `TEXT`],
      ["decision", `TEXT`],
      ["riskScore", `DOUBLE PRECISION`],
      ["confidence", `DOUBLE PRECISION`],
      ["recommendation", `TEXT`],
      ["findings", `TEXT NOT NULL DEFAULT '[]'`],
      ["notes", `TEXT`],
      ["actorUserId", `TEXT`],
      ["createdAt", `TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`],
    ];
    for (const [column, ddl] of verificationCols) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "VerificationReview" ADD COLUMN IF NOT EXISTS "${column}" ${ddl}`,
      );
    }

    // Helpful indexes (IF NOT EXISTS)
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "TripRequest_customerId_idx" ON "TripRequest"("customerId")`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "TripRequest_status_pickupAt_idx" ON "TripRequest"("status", "pickupAt")`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "Offer_tripRequestId_status_idx" ON "Offer"("tripRequestId", "status")`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "Vehicle_driverId_idx" ON "Vehicle"("driverId")`,
    );

    return { ok: true };
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 300) : String(error);
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
