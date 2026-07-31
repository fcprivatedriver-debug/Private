import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * POST /api/demo/seed
 * Authorization: Bearer <CRON_SECRET|AUTH_SECRET>
 *
 * 1) Applies FC Private Driver schema via SQL migration (rewrites public schema)
 * 2) Seeds demo plans + accounts
 */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const expected =
    process.env.CRON_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "fc-private-driver-demo-auth-secret-32chars";

  if (!token || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const direct =
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL;

  const prisma = new PrismaClient(
    direct ? { datasources: { db: { url: direct } } } : undefined,
  );
  const steps: string[] = [];
  steps.push(direct?.includes("pooler") ? "using-pooler-url" : "using-direct-url");

  try {
    // Detect legacy / missing schema
    let needsSchema = false;
    try {
      await prisma.$queryRaw`SELECT 1 FROM "SiteSettings" LIMIT 1`;
    } catch {
      needsSchema = true;
    }

    if (needsSchema) {
      steps.push("applying-schema");
      const migrationPath = path.join(
        process.cwd(),
        "prisma/migrations/20260731090000_fc_private_driver_init/migration.sql",
      );
      const sql = await readFile(migrationPath, "utf8");

      // Replace public schema so legacy ZRIK objects cannot block CREATE TYPE/TABLE
      await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS public CASCADE`);
      await prisma.$executeRawUnsafe(`CREATE SCHEMA public`);
      await prisma.$executeRawUnsafe(`GRANT ALL ON SCHEMA public TO PUBLIC`);
      await prisma.$executeRawUnsafe(`GRANT ALL ON SCHEMA public TO CURRENT_USER`);

      const statements = sql
        .split(";")
        .map((s) =>
          s
            .split("\n")
            .filter((line) => !line.trim().startsWith("--"))
            .join("\n")
            .trim(),
        )
        .filter((s) => s.length > 0);

      steps.push(`schema-statements:${statements.length}`);
      for (const statement of statements) {
        if (/^CREATE SCHEMA/i.test(statement)) continue;
        await prisma.$executeRawUnsafe(statement);
      }
      steps.push("schema-applied");
    } else {
      steps.push("schema-ok");
    }

    const passwordHash = await hash("fcpd123", 12);

    await prisma.siteSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        demoMode: true,
        brandName: "FC Private Driver",
        supportEmail: "fcprivatedriver@gmail.com",
        supportPhone: "+351 933 239 595",
        whatsappNumber: "+351933239595",
      },
      update: { demoMode: true },
    });

    const privado = await prisma.plan.upsert({
      where: { code: "privado" },
      create: {
        code: "privado",
        namePt: "Plano Privado",
        nameEn: "Private Plan",
        descriptionPt: "300 minutos mensais · equivalente a 5 horas",
        descriptionEn: "300 monthly minutes",
        priceCents: 9900,
        monthlyMinutes: 300,
        equivalentHours: 5,
        sortOrder: 1,
        featuresJson: JSON.stringify(["300 minutos mensais", "Renovação mensal"]),
      },
      update: { active: true, priceCents: 9900, monthlyMinutes: 300 },
    });

    await prisma.plan.upsert({
      where: { code: "privado-plus" },
      create: {
        code: "privado-plus",
        namePt: "Plano Privado Plus",
        nameEn: "Private Plus Plan",
        descriptionPt: "600 minutos mensais · equivalente a 10 horas",
        descriptionEn: "600 monthly minutes",
        priceCents: 19900,
        monthlyMinutes: 600,
        equivalentHours: 10,
        sortOrder: 2,
        featuresJson: JSON.stringify(["600 minutos mensais", "Renovação mensal"]),
      },
      update: { active: true },
    });

    for (const pkg of [
      { code: "extra-30", namePt: "30 minutos adicionais", nameEn: "30 extra", minutes: 30, priceCents: 1500, sortOrder: 1 },
      { code: "extra-60", namePt: "60 minutos adicionais", nameEn: "60 extra", minutes: 60, priceCents: 2800, sortOrder: 2 },
      { code: "extra-120", namePt: "120 minutos adicionais", nameEn: "120 extra", minutes: 120, priceCents: 5000, sortOrder: 3 },
    ]) {
      await prisma.extraMinutePackage.upsert({
        where: { code: pkg.code },
        create: pkg,
        update: { active: true, priceCents: pkg.priceCents },
      });
    }

    const admin = await prisma.user.upsert({
      where: { email: "admin@fcprivatedriver.demo" },
      create: {
        email: "admin@fcprivatedriver.demo",
        name: "Administrador FC",
        phone: "+351933239595",
        role: "ADMIN",
        status: "ACTIVE",
        emailVerified: new Date(),
        passwordHash,
      },
      update: { passwordHash, status: "ACTIVE", emailVerified: new Date(), role: "ADMIN" },
    });

    const customer = await prisma.user.upsert({
      where: { email: "cliente@fcprivatedriver.demo" },
      create: {
        email: "cliente@fcprivatedriver.demo",
        name: "Ana Silva",
        phone: "+351910000001",
        role: "CUSTOMER",
        status: "ACTIVE",
        emailVerified: new Date(),
        passwordHash,
      },
      update: { passwordHash, status: "ACTIVE", emailVerified: new Date(), role: "CUSTOMER" },
    });

    const driver = await prisma.user.upsert({
      where: { email: "motorista@fcprivatedriver.demo" },
      create: {
        email: "motorista@fcprivatedriver.demo",
        name: "Carlos Mendes",
        phone: "+351933239595",
        role: "DRIVER",
        status: "ACTIVE",
        emailVerified: new Date(),
        passwordHash,
      },
      update: { passwordHash, status: "ACTIVE", emailVerified: new Date(), role: "DRIVER" },
    });

    await prisma.customerProfile.upsert({
      where: { userId: customer.id },
      create: {
        userId: customer.id,
        fullName: "Ana Silva",
        addressLine: "Av. da Liberdade 100",
        postalCode: "1250-096",
        city: "Lisboa",
        phone: "+351910000001",
        profileComplete: true,
        habitsComplete: true,
      },
      update: { profileComplete: true },
    });

    await prisma.driverProfile.upsert({
      where: { userId: driver.id },
      create: {
        userId: driver.id,
        phone: "+351933239595",
        active: true,
        photoUrl: "/brand/fc-icon.svg",
      },
      update: { active: true },
    });

    const driverProfile = await prisma.driverProfile.findUniqueOrThrow({
      where: { userId: driver.id },
    });
    if ((await prisma.vehicle.count({ where: { driverId: driverProfile.id } })) === 0) {
      await prisma.vehicle.create({
        data: {
          driverId: driverProfile.id,
          make: "Mercedes-Benz",
          model: "Classe E",
          plate: "AA-00-FC",
          color: "Preto",
          seats: 4,
        },
      });
    }

    if (!(await prisma.subscription.findFirst({ where: { userId: customer.id, status: "ACTIVE" } }))) {
      const periodStart = new Date();
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      await prisma.subscription.create({
        data: {
          userId: customer.id,
          planId: privado.id,
          status: "ACTIVE",
          periodStart,
          periodEnd,
          nextRenewalAt: periodEnd,
          minutesIncluded: 300,
          minutesUsed: 85,
          minutesReserved: 40,
        },
      });
    }

    steps.push("seeded");
    return NextResponse.json({
      ok: true,
      steps,
      admin: admin.email,
      customer: customer.email,
      driver: driver.email,
      password: "fcpd123",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        steps,
        error: err instanceof Error ? err.message : "seed failed",
      },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET() {
  return NextResponse.json({
    hint: "POST with Authorization: Bearer <CRON_SECRET> to apply schema + seed demo data",
  });
}
