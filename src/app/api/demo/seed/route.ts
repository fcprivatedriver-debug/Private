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

    // Ensure Diamante schema pieces exist even on previously synced DBs
    try {
      await prisma.$queryRaw`SELECT 1 FROM "DiamondProposal" LIMIT 1`;
      await prisma.$queryRaw`SELECT "tier" FROM "Plan" LIMIT 1`;
    } catch {
      steps.push("patching-plan-tiers");
      const patches = [
        `DO $$ BEGIN CREATE TYPE "DiamondProposalStatus" AS ENUM ('RECEIVED','UNDER_REVIEW','CONTACTED','PROPOSAL_SENT','ACCEPTED','REJECTED'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
        `ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "tier" TEXT NOT NULL DEFAULT 'custom'`,
        `ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "showPrice" BOOLEAN NOT NULL DEFAULT true`,
        `ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "isPersonalized" BOOLEAN NOT NULL DEFAULT false`,
        `ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "ctaLabelPt" TEXT`,
        `ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "ctaLabelEn" TEXT`,
        `ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "accentColor" TEXT`,
        `ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "specialConditions" TEXT`,
        `ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "internalNotes" TEXT`,
        `ALTER TABLE "Plan" ALTER COLUMN "priceCents" SET DEFAULT 0`,
        `ALTER TABLE "Plan" ALTER COLUMN "monthlyMinutes" SET DEFAULT 0`,
        `CREATE TABLE IF NOT EXISTS "DiamondProposal" (
          "id" TEXT PRIMARY KEY,
          "name" TEXT NOT NULL,
          "company" TEXT,
          "email" TEXT NOT NULL,
          "phone" TEXT NOT NULL,
          "estimatedUsers" INTEGER,
          "tripsPerWeek" INTEGER,
          "usualHours" TEXT,
          "serviceZone" TEXT,
          "notes" TEXT,
          "status" "DiamondProposalStatus" NOT NULL DEFAULT 'RECEIVED',
          "adminNotes" TEXT,
          "convertedPlanId" TEXT,
          "convertedSubscriptionId" TEXT,
          "convertedAt" TIMESTAMP(3),
          "contactedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
      ];
      for (const sql of patches) {
        try {
          await prisma.$executeRawUnsafe(sql);
        } catch (err) {
          steps.push(`patch-warn:${err instanceof Error ? err.message.slice(0, 80) : "err"}`);
        }
      }
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

    const passwordHash = await hash("fcpd1234", 12);

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

    // Deactivate legacy plans
    await prisma.plan.updateMany({
      where: { code: { in: ["privado", "privado-plus"] } },
      data: { active: false },
    });

    const planDefs = [
      {
        code: "bronze",
        tier: "bronze",
        namePt: "Bronze",
        nameEn: "Bronze",
        descriptionPt: "Ideal para utilização ocasional",
        descriptionEn: "Ideal for occasional use",
        showPrice: true,
        priceCents: 5900,
        monthlyMinutes: 120,
        equivalentHours: 2,
        sortOrder: 1,
        accentColor: "#8B5E3C",
        ctaLabelPt: "Escolher plano",
        ctaLabelEn: "Choose plan",
        featuresJson: JSON.stringify([
          "120 minutos mensais",
          "Ideal para utilização ocasional",
          "Agendamento antecipado",
          "Histórico de viagens",
          "Suporte por e-mail",
        ]),
      },
      {
        code: "prata",
        tier: "silver",
        namePt: "Prata",
        nameEn: "Silver",
        descriptionPt: "Ideal para utilização frequente",
        descriptionEn: "Ideal for frequent use",
        showPrice: true,
        priceCents: 9900,
        monthlyMinutes: 300,
        equivalentHours: 5,
        sortOrder: 2,
        accentColor: "#6B7280",
        ctaLabelPt: "Escolher plano",
        ctaLabelEn: "Choose plan",
        featuresJson: JSON.stringify([
          "300 minutos mensais",
          "Prioridade nas marcações",
          "Contacto direto por WhatsApp",
          "Gestão simplificada das viagens",
          "Ideal para utilização frequente",
        ]),
      },
      {
        code: "ouro",
        tier: "gold",
        namePt: "Ouro",
        nameEn: "Gold",
        descriptionPt: "Ideal para empresários e clientes frequentes",
        descriptionEn: "Ideal for business and frequent travellers",
        showPrice: true,
        priceCents: 29900,
        monthlyMinutes: 600,
        equivalentHours: 10,
        sortOrder: 3,
        accentColor: "#B45309",
        ctaLabelPt: "Escolher plano",
        ctaLabelEn: "Choose plan",
        featuresJson: JSON.stringify([
          "600 minutos mensais",
          "Prioridade elevada",
          "Contacto direto com o motorista",
          "Gestão completa das viagens",
          "Ideal para empresários e clientes frequentes",
        ]),
      },
      {
        code: "diamante",
        tier: "diamond",
        namePt: "Diamante",
        nameEn: "Diamond",
        descriptionPt:
          "Solução totalmente personalizada para quem pretende um serviço exclusivo de motorista privado.",
        descriptionEn:
          "A fully personalised solution for those who want an exclusive private driver service.",
        showPrice: false,
        priceCents: 0,
        monthlyMinutes: 0,
        equivalentHours: null as number | null,
        sortOrder: 4,
        accentColor: "#0A4F5C",
        ctaLabelPt: "Pedir proposta personalizada",
        ctaLabelEn: "Request a custom proposal",
        featuresJson: JSON.stringify([
          "Empresas",
          "Hotéis",
          "Alojamentos Locais",
          "Clínicas",
          "Escritórios",
          "Famílias",
          "Clientes com necessidades específicas",
        ]),
      },
    ];

    let prataPlanId = "";
    for (const def of planDefs) {
      const row = await prisma.plan.upsert({
        where: { code: def.code },
        create: def,
        update: {
          tier: def.tier,
          namePt: def.namePt,
          nameEn: def.nameEn,
          descriptionPt: def.descriptionPt,
          descriptionEn: def.descriptionEn,
          showPrice: def.showPrice,
          priceCents: def.priceCents,
          monthlyMinutes: def.monthlyMinutes,
          equivalentHours: def.equivalentHours,
          sortOrder: def.sortOrder,
          accentColor: def.accentColor,
          ctaLabelPt: def.ctaLabelPt,
          ctaLabelEn: def.ctaLabelEn,
          featuresJson: def.featuresJson,
          active: true,
          isPersonalized: false,
        },
      });
      if (def.code === "prata") prataPlanId = row.id;
    }

    const privado = { id: prataPlanId };

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
      password: "fcpd1234",
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
