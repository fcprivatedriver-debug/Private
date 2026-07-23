import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_CLASSES = [
  {
    id: "vc_sedan",
    code: "SEDAN",
    namePt: "Sedan",
    nameEn: "Sedan",
    descriptionPt: "Carro standard até 3 passageiros",
    descriptionEn: "Standard car up to 3 passengers",
    minPassengers: 1,
    maxPassengers: 3,
    maxLuggage: 2,
    iconKey: "sedan",
    sortOrder: 10,
  },
  {
    id: "vc_executive",
    code: "EXECUTIVE",
    namePt: "Executivo",
    nameEn: "Executive",
    descriptionPt: "Berlina executiva confortável",
    descriptionEn: "Comfortable executive saloon",
    minPassengers: 1,
    maxPassengers: 3,
    maxLuggage: 3,
    iconKey: "executive",
    sortOrder: 20,
  },
  {
    id: "vc_van",
    code: "VAN",
    namePt: "Van",
    nameEn: "Van",
    descriptionPt: "Van para grupos e bagagem extra",
    descriptionEn: "Van for groups and extra luggage",
    minPassengers: 1,
    maxPassengers: 7,
    maxLuggage: 7,
    iconKey: "van",
    sortOrder: 30,
  },
  {
    id: "vc_minibus",
    code: "MINIBUS",
    namePt: "Minibus",
    nameEn: "Minibus",
    descriptionPt: "Minibus para grupos maiores",
    descriptionEn: "Minibus for larger groups",
    minPassengers: 1,
    maxPassengers: 16,
    maxLuggage: 16,
    iconKey: "minibus",
    sortOrder: 40,
  },
  {
    id: "vc_luxury",
    code: "LUXURY",
    namePt: "Luxo",
    nameEn: "Luxury",
    descriptionPt: "Veículo de luxo premium",
    descriptionEn: "Premium luxury vehicle",
    minPassengers: 1,
    maxPassengers: 3,
    maxLuggage: 3,
    iconKey: "luxury",
    sortOrder: 50,
  },
] as const;

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

  for (const vc of DEFAULT_CLASSES) {
    await prisma.vehicleClass.upsert({
      where: { code: vc.code },
      create: { ...vc, active: true },
      update: {
        namePt: vc.namePt,
        nameEn: vc.nameEn,
        descriptionPt: vc.descriptionPt,
        descriptionEn: vc.descriptionEn,
        minPassengers: vc.minPassengers,
        maxPassengers: vc.maxPassengers,
        maxLuggage: vc.maxLuggage,
        iconKey: vc.iconKey,
        sortOrder: vc.sortOrder,
        active: true,
      },
    });
  }

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
          onboardingStatus: "APPROVED",
          onboardingStep: "done",
          completenessScore: 100,
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
          aiRiskScore: 18,
          aiConfidence: 91,
          aiSummary: "AI recommends approval for Carlos Motorista (risk 18/100).",
          documents: JSON.stringify([
            { type: "license", status: "verified", label: "Driving licence" },
            { type: "insurance", status: "verified", label: "Fleet insurance" },
          ]),
          verifiedAt: new Date(),
          submittedAt: new Date(),
          vehicles: {
            create: {
              make: "Mercedes-Benz",
              model: "E-Class",
              year: 2023,
              color: "Black",
              plate: "AA-00-MV",
              seats: 3,
              luggageCapacity: 3,
              vehicleClassId: "vc_executive",
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
          onboardingStatus: "APPROVED",
          onboardingStep: "done",
          completenessScore: 100,
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
          aiRiskScore: 22,
          aiConfidence: 88,
          aiSummary: "AI recommends approval for Rita Condutora (risk 22/100).",
          documents: JSON.stringify([
            { type: "license", status: "verified", label: "Driving licence" },
          ]),
          verifiedAt: new Date(),
          submittedAt: new Date(),
          vehicles: {
            create: {
              make: "Volkswagen",
              model: "Caravelle",
              year: 2022,
              color: "Silver",
              plate: "BB-11-MV",
              seats: 7,
              luggageCapacity: 7,
              vehicleClassId: "vc_van",
            },
          },
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      email: "pendente@movio.app",
      name: "João Pendente",
      role: "DRIVER",
      passwordHash,
      locale: "pt",
      driverProfile: {
        create: {
          status: "PENDING_VERIFICATION",
          onboardingStatus: "IN_PROGRESS",
          onboardingStep: "documents",
          completenessScore: 45,
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
              vehicleClassId: "vc_sedan",
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
      preferredVehicleClassId: "vc_executive",
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

  console.log("Movio seed complete (DB-driven vehicle classes).");
  console.log("Accounts (password: movio123):");
  console.log(`  Admin:      ${admin.email}`);
  console.log(`  Customer:   ${customer.email}`);
  console.log(`  Driver:     ${driver.email}`);
  console.log(`  Driver 2:   ${driver2.email}`);
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
