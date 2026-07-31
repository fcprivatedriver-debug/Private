#!/usr/bin/env node
/**
 * Ensure critical ZELU tables exist on the target database.
 * Shared Neon can report migrate as applied while tables are missing
 * (partial/foreign migration history). In that case, `db push` repairs schema.
 */
import { spawnSync } from "node:child_process";
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

async function main() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    console.error("[ensure-schema] DATABASE_URL missing");
    process.exit(1);
  }

  const adapter = new PrismaNeonHttp(sanitizeDatabaseUrl(raw), {
    arrayMode: false,
    fullResults: true,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$queryRaw`SELECT 1`;
    try {
      const count = await prisma.vehicleClass.count();
      console.log("[ensure-schema] VehicleClass OK, count=", count);
      if (count === 0) {
        console.log("[ensure-schema] Seeding default vehicle classes…");
        await prisma.vehicleClass.createMany({
          data: [
            {
              code: "SEDAN",
              namePt: "Sedan",
              nameEn: "Sedan",
              descriptionPt: "Conforto para até 3 passageiros",
              descriptionEn: "Comfort for up to 3 passengers",
              minPassengers: 1,
              maxPassengers: 3,
              maxLuggage: 2,
              sortOrder: 10,
              active: true,
            },
            {
              code: "EXECUTIVE",
              namePt: "Executivo",
              nameEn: "Executive",
              descriptionPt: "Premium para até 3 passageiros",
              descriptionEn: "Premium for up to 3 passengers",
              minPassengers: 1,
              maxPassengers: 3,
              maxLuggage: 3,
              sortOrder: 20,
              active: true,
            },
            {
              code: "VAN",
              namePt: "Van",
              nameEn: "Van",
              descriptionPt: "Grupo até 7 passageiros",
              descriptionEn: "Group up to 7 passengers",
              minPassengers: 1,
              maxPassengers: 7,
              maxLuggage: 6,
              sortOrder: 30,
              active: true,
            },
          ],
          skipDuplicates: true,
        });
        console.log("[ensure-schema] Default classes seeded");
      }
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("[ensure-schema] VehicleClass missing/broken:", message.slice(0, 200));
    }

    console.log("[ensure-schema] Running prisma db push to sync schema…");
    const push = spawnSync(
      "npx",
      ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"],
      { encoding: "utf8", env: process.env, stdio: ["ignore", "pipe", "pipe"] },
    );
    process.stdout.write(push.stdout || "");
    process.stderr.write(push.stderr || "");
    if ((push.status ?? 1) !== 0) {
      console.error("[ensure-schema] db push failed");
      process.exit(push.status ?? 1);
    }

    // Re-check
    const prisma2 = new PrismaClient({
      adapter: new PrismaNeonHttp(sanitizeDatabaseUrl(raw), {
        arrayMode: false,
        fullResults: true,
      }),
    });
    try {
      const count = await prisma2.vehicleClass.count();
      console.log("[ensure-schema] VehicleClass repaired, count=", count);
      if (count === 0) {
        console.log("[ensure-schema] Seeding default vehicle classes…");
        await prisma2.vehicleClass.createMany({
          data: [
            {
              code: "SEDAN",
              namePt: "Sedan",
              nameEn: "Sedan",
              descriptionPt: "Conforto para até 3 passageiros",
              descriptionEn: "Comfort for up to 3 passengers",
              minPassengers: 1,
              maxPassengers: 3,
              maxLuggage: 2,
              sortOrder: 10,
              active: true,
            },
            {
              code: "EXECUTIVE",
              namePt: "Executivo",
              nameEn: "Executive",
              descriptionPt: "Premium para até 3 passageiros",
              descriptionEn: "Premium for up to 3 passengers",
              minPassengers: 1,
              maxPassengers: 3,
              maxLuggage: 3,
              sortOrder: 20,
              active: true,
            },
            {
              code: "VAN",
              namePt: "Van",
              nameEn: "Van",
              descriptionPt: "Grupo até 7 passageiros",
              descriptionEn: "Group up to 7 passengers",
              minPassengers: 1,
              maxPassengers: 7,
              maxLuggage: 6,
              sortOrder: 30,
              active: true,
            },
          ],
          skipDuplicates: true,
        });
        console.log("[ensure-schema] Default classes seeded");
      }
    } finally {
      await prisma2.$disconnect();
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[ensure-schema] fatal", error);
  process.exit(1);
});
