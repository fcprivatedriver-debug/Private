import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.payment.deleteMany();
  await prisma.review.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.tripRequest.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.commissionRule.deleteMany();
  await prisma.driverProfile.deleteMany();
  await prisma.customerProfile.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  await prisma.platformSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      defaultCurrency: "EUR",
      defaultCommissionPercent: 15,
      supportedCurrencies: JSON.stringify(["EUR"]),
    },
    update: {
      defaultCurrency: "EUR",
      defaultCommissionPercent: 15,
      supportedCurrencies: JSON.stringify(["EUR"]),
    },
  });

  const passwordHash = await bcrypt.hash("movio123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@movio.app",
      name: "Admin Movio",
      role: "ADMIN",
      passwordHash,
      phone: "+351900000001",
      locale: "pt",
    },
  });

  const customer = await prisma.user.create({
    data: {
      email: "cliente@movio.app",
      name: "Ana Cliente",
      role: "CUSTOMER",
      passwordHash,
      phone: "+351910000001",
      locale: "pt",
      customerProfile: { create: { defaultCurrency: "EUR" } },
    },
  });

  const driver = await prisma.user.create({
    data: {
      email: "motorista@movio.app",
      name: "Carlos Motorista",
      role: "DRIVER",
      passwordHash,
      phone: "+351920000001",
      locale: "pt",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
      driverProfile: {
        create: {
          status: "ACTIVE",
          photoUrl:
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
          bio: "Executive chauffeur with 8 years of airport transfer experience across Portugal.",
          languagesSpoken: JSON.stringify(["pt", "en", "es"]),
          yearsOfExperience: 8,
          ratingAvg: 4.9,
          ratingCount: 42,
          completedTripsCount: 380,
          responseRate: 96,
          avgResponseTimeMinutes: 12,
          documents: JSON.stringify([
            { type: "license", status: "verified", label: "Driving licence" },
            { type: "insurance", status: "verified", label: "Fleet insurance" },
          ]),
          verifiedAt: new Date(),
          vehicles: {
            create: {
              make: "Mercedes-Benz",
              model: "E-Class",
              year: 2023,
              color: "Black",
              plate: "AA-00-MV",
              seats: 3,
              luggageCapacity: 3,
              category: "EXECUTIVE",
            },
          },
        },
      },
    },
    include: { driverProfile: { include: { vehicles: true } } },
  });

  const driver2 = await prisma.user.create({
    data: {
      email: "motorista2@movio.app",
      name: "Rita Condutora",
      role: "DRIVER",
      passwordHash,
      phone: "+351920000002",
      locale: "en",
      driverProfile: {
        create: {
          status: "ACTIVE",
          photoUrl:
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
          bio: "Specialist in Lisbon–Algarve private transfers.",
          languagesSpoken: JSON.stringify(["pt", "en"]),
          yearsOfExperience: 5,
          ratingAvg: 4.7,
          ratingCount: 28,
          completedTripsCount: 210,
          responseRate: 91,
          avgResponseTimeMinutes: 18,
          documents: JSON.stringify([
            { type: "license", status: "verified", label: "Driving licence" },
          ]),
          verifiedAt: new Date(),
          vehicles: {
            create: {
              make: "Volkswagen",
              model: "Caravelle",
              year: 2022,
              color: "Silver",
              plate: "BB-11-MV",
              seats: 7,
              luggageCapacity: 7,
              category: "VAN",
            },
          },
        },
      },
    },
  });

  const pendingDriver = await prisma.user.create({
    data: {
      email: "pendente@movio.app",
      name: "João Pendente",
      role: "DRIVER",
      passwordHash,
      locale: "pt",
      driverProfile: {
        create: {
          status: "PENDING_VERIFICATION",
          bio: "Awaiting document verification.",
          languagesSpoken: JSON.stringify(["pt"]),
          yearsOfExperience: 2,
          documents: JSON.stringify([
            { type: "license", status: "pending", label: "Driving licence" },
          ]),
          vehicles: {
            create: {
              make: "BMW",
              model: "5 Series",
              year: 2021,
              color: "Blue",
              plate: "CC-22-MV",
              seats: 3,
              luggageCapacity: 2,
              category: "SEDAN",
            },
          },
        },
      },
    },
  });

  const pickupAt = new Date();
  pickupAt.setDate(pickupAt.getDate() + 3);
  pickupAt.setHours(10, 30, 0, 0);

  const trip = await prisma.tripRequest.create({
    data: {
      customerId: customer.id,
      pickupAddress: "Aeroporto de Lisboa (LIS), Lisboa",
      pickupLat: 38.7756,
      pickupLng: -9.1354,
      dropoffAddress: "Praça do Comércio, Lisboa",
      dropoffLat: 38.7075,
      dropoffLng: -9.1364,
      pickupAt,
      passengers: 2,
      luggage: 2,
      notes: "Arrival flight TP1234. Name board: Ana.",
      flightNumber: "TP1234",
      status: "OPEN",
      preferredVehicleCategory: "EXECUTIVE",
      currency: "EUR",
      expiresAt: new Date(pickupAt.getTime() - 2 * 60 * 60 * 1000),
    },
  });

  const vehicleId = driver.driverProfile!.vehicles[0]!.id;

  await prisma.offer.create({
    data: {
      tripRequestId: trip.id,
      driverId: driver.id,
      vehicleId,
      priceAmount: 4500,
      currency: "EUR",
      message: "Includes 60 min waiting time and bottled water.",
      includesTolls: true,
      includesWaiting: true,
      validUntil: trip.expiresAt,
      status: "PENDING",
    },
  });

  console.log("Movio Phase 0 seed complete.");
  console.log("Accounts (password: movio123):");
  console.log(`  Admin:      ${admin.email}`);
  console.log(`  Customer:   ${customer.email}`);
  console.log(`  Driver:     ${driver.email}`);
  console.log(`  Driver 2:   ${driver2.email}`);
  console.log(`  Pending:    ${pendingDriver.email}`);
  console.log(`  Demo OPEN trip: ${trip.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
