#!/usr/bin/env node
/**
 * Ensure critical ZELU tables exist on the target database.
 * Never fails the build: logs warnings and exits 0 so `next build` can proceed.
 * Prefer raw DDL over `prisma db push` — shared Neon often has foreign schemas
 * (Mafil/Mel) that make push fail while SELECT 1 still works.
 * Runtime repair also lives in /api/health + vehicle-classes as a safety net.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaNeonHttp } from "@prisma/adapter-neon";

function sanitizeDatabaseUrl(url) {
  try {
    const u = new URL(url);
    u.searchParams.delete("channel_binding");
    if (!u.searchParams.has("sslmode")) u.searchParams.set("sslmode", "require");
    return u.toString();
  } catch {
    return String(url).replace(/&?channel_binding=require/g, "");
  }
}

function makePrisma(raw) {
  return new PrismaClient({
    adapter: new PrismaNeonHttp(sanitizeDatabaseUrl(raw), {
      arrayMode: false,
      fullResults: true,
    }),
  });
}

const DEFAULT_CLASSES = [
  {
    id: "vc_comfort",
    code: "COMFORT",
    namePt: "Comfort",
    nameEn: "Comfort",
    descriptionPt: "Veículos executivos standard até 4 passageiros",
    descriptionEn: "Standard executive vehicles up to 4 passengers",
    minPassengers: 1,
    maxPassengers: 4,
    maxLuggage: 3,
    iconKey: "comfort",
    sortOrder: 10,
    active: true,
  },
  {
    id: "vc_premium",
    code: "PREMIUM",
    namePt: "Premium",
    nameEn: "Premium",
    descriptionPt: "Veículos executivos de luxo até 4 passageiros",
    descriptionEn: "Luxury executive vehicles up to 4 passengers",
    minPassengers: 1,
    maxPassengers: 4,
    maxLuggage: 4,
    iconKey: "premium",
    sortOrder: 20,
    active: true,
  },
  {
    id: "vc_van",
    code: "VAN",
    namePt: "Van",
    nameEn: "Van",
    descriptionPt: "Vans executivas para famílias e grupos até 8 passageiros",
    descriptionEn: "Executive vans for families and groups up to 8 passengers",
    minPassengers: 1,
    maxPassengers: 8,
    maxLuggage: 8,
    iconKey: "van",
    sortOrder: 30,
    active: true,
  },
];

async function createVehicleClassTable(prisma) {
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
}

async function seedClasses(prisma) {
  await prisma.vehicleClass.createMany({
    data: DEFAULT_CLASSES,
    skipDuplicates: true,
  });
}

async function main() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    console.warn("[ensure-schema] DATABASE_URL missing — skip");
    return;
  }

  const prisma = makePrisma(raw);
  try {
    await prisma.$queryRaw`SELECT 1`;

    let needsCreate = false;
    try {
      const count = await prisma.vehicleClass.count();
      console.log("[ensure-schema] VehicleClass OK, count=", count);
      if (count === 0) {
        await seedClasses(prisma);
        console.log("[ensure-schema] Default classes seeded");
      }
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("[ensure-schema] VehicleClass missing/broken:", message.slice(0, 200));
      needsCreate = /does not exist|P2021/i.test(message);
    }

    if (!needsCreate) {
      console.warn("[ensure-schema] unexpected VehicleClass error — skip DDL");
      return;
    }

    console.log("[ensure-schema] Creating VehicleClass via DDL…");
    await createVehicleClassTable(prisma);
    await seedClasses(prisma);
    const count = await prisma.vehicleClass.count();
    console.log("[ensure-schema] VehicleClass repaired, count=", count);
  } catch (error) {
    console.warn("[ensure-schema] non-fatal error", error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.warn("[ensure-schema] swallowed fatal", error);
    process.exit(0);
  });
