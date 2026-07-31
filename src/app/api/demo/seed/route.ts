import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

/**
 * POST /api/demo/seed
 * Authorization: Bearer <CRON_SECRET|AUTH_SECRET>
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

  const prisma = new PrismaClient();
  try {
    const passwordHash = await hash("fcpd123", 12);

    // Ensure settings
    await prisma.siteSettings.upsert({
      where: { id: "default" },
      create: { id: "default", demoMode: true },
      update: { demoMode: true },
    });

    // Plans
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
      update: { active: true, priceCents: 19900, monthlyMinutes: 600 },
    });

    for (const pkg of [
      { code: "extra-30", namePt: "30 minutos adicionais", nameEn: "30 extra", minutes: 30, priceCents: 1500, sortOrder: 1 },
      { code: "extra-60", namePt: "60 minutos adicionais", nameEn: "60 extra", minutes: 60, priceCents: 2800, sortOrder: 2 },
      { code: "extra-120", namePt: "120 minutos adicionais", nameEn: "120 extra", minutes: 120, priceCents: 5000, sortOrder: 3 },
    ]) {
      await prisma.extraMinutePackage.upsert({
        where: { code: pkg.code },
        create: pkg,
        update: { priceCents: pkg.priceCents, minutes: pkg.minutes, active: true },
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
      update: { passwordHash, status: "ACTIVE", emailVerified: new Date() },
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
        customerProfile: {
          create: {
            fullName: "Ana Silva",
            addressLine: "Av. da Liberdade 100",
            postalCode: "1250-096",
            city: "Lisboa",
            phone: "+351910000001",
            profileComplete: true,
            habitsComplete: true,
          },
        },
      },
      update: { passwordHash, status: "ACTIVE", emailVerified: new Date() },
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
        driverProfile: {
          create: {
            phone: "+351933239595",
            active: true,
            photoUrl: "/brand/fc-icon.svg",
            vehicles: {
              create: {
                make: "Mercedes-Benz",
                model: "Classe E",
                plate: "AA-00-FC",
                color: "Preto",
                seats: 4,
              },
            },
          },
        },
      },
      update: { passwordHash, status: "ACTIVE", emailVerified: new Date() },
    });

    // Ensure customer profile + active subscription
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
      },
      update: { active: true },
    });

    const existingSub = await prisma.subscription.findFirst({
      where: { userId: customer.id, status: "ACTIVE" },
    });
    if (!existingSub) {
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

    return NextResponse.json({
      ok: true,
      admin: admin.email,
      customer: customer.email,
      driver: driver.email,
      password: "fcpd123",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "seed failed" },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET() {
  return NextResponse.json({
    hint: "POST with Authorization: Bearer <CRON_SECRET> to seed demo data",
  });
}
