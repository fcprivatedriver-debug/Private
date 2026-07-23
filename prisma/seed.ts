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

function hoursFromNow(h: number) {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

function daysFromNow(d: number, hour = 10, minute = 0) {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  dt.setHours(hour, minute, 0, 0);
  return dt;
}

async function main() {
  await prisma.payment.deleteMany();
  await prisma.review.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.tripRequest.deleteMany();
  await prisma.verificationReview.deleteMany();
  await prisma.driverDocument.deleteMany();
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

  await prisma.commissionRule.create({
    data: {
      name: "Default marketplace",
      percent: 15,
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
          submittedAt: daysFromNow(-30),
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
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
      driverProfile: {
        create: {
          status: "ACTIVE",
          onboardingStatus: "APPROVED",
          onboardingStep: "done",
          completenessScore: 100,
          photoUrl:
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
          bio: "Specialist in Lisbon–Algarve private transfers and group vans.",
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
          submittedAt: daysFromNow(-20),
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
    include: { driverProfile: { include: { vehicles: true } } },
  });

  const pending = await prisma.user.create({
    data: {
      email: "pendente@movio.app",
      name: "João Pendente",
      role: "DRIVER",
      passwordHash,
      phone: "+351920000003",
      locale: "pt",
      driverProfile: {
        create: {
          status: "PENDING_VERIFICATION",
          onboardingStatus: "UNDER_REVIEW",
          onboardingStep: "review",
          completenessScore: 92,
          photoUrl:
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
          bio: "Lisbon-based chauffeur seeking platform approval. Airport transfers and hotel runs.",
          languagesSpoken: JSON.stringify(["pt", "en"]),
          yearsOfExperience: 3,
          aiRiskScore: 34,
          aiConfidence: 78,
          aiSummary:
            "AI flags minor document expiry risk. Recommend manual review of insurance certificate.",
          documents: JSON.stringify([
            { type: "license", status: "pending", label: "Driving licence" },
            { type: "insurance", status: "pending", label: "Insurance" },
          ]),
          submittedAt: hoursFromNow(-6),
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
    include: { driverProfile: true },
  });

  const pendingProfileId = pending.driverProfile!.id;
  const docTypes = [
    "IDENTITY",
    "DRIVING_LICENSE",
    "VEHICLE_REGISTRATION",
    "INSURANCE",
    "PROFILE_PHOTO",
  ] as const;

  for (const type of docTypes) {
    await prisma.driverDocument.create({
      data: {
        driverProfileId: pendingProfileId,
        type,
        status: type === "INSURANCE" ? "AI_FLAGGED" : "AI_PASSED",
        fileName: `${type.toLowerCase()}.pdf`,
        mimeType: "application/pdf",
        sizeBytes: 120_000,
        storageKey: `demo/${pendingProfileId}/${type.toLowerCase()}.pdf`,
        url: `/api/uploads/demo/${type.toLowerCase()}.pdf`,
        aiScore: type === "INSURANCE" ? 58 : 88,
        aiFlags:
          type === "INSURANCE"
            ? JSON.stringify(["expiry_within_30_days"])
            : JSON.stringify([]),
        aiAnalysis: JSON.stringify({
          readable: true,
          nameMatch: true,
          note:
            type === "INSURANCE"
              ? "Policy expires soon — verify renewal."
              : "Document looks consistent.",
        }),
      },
    });
  }

  await prisma.verificationReview.create({
    data: {
      driverProfileId: pendingProfileId,
      source: "AI",
      decision: "ESCALATE",
      riskScore: 34,
      confidence: 78,
      recommendation: "REQUEST_INFO or manual approve after insurance check",
      findings: JSON.stringify([
        { code: "INSURANCE_EXPIRY", severity: "medium" },
        { code: "IDENTITY_OK", severity: "low" },
      ]),
      notes: "Heuristic AI review seeded for demo queue.",
    },
  });

  const carlosVehicleId = driver.driverProfile!.vehicles[0]!.id;
  const ritaVehicleId = driver2.driverProfile!.vehicles[0]!.id;

  // 1) OPEN trip with competing offers — primary customer demo
  const openPickup = daysFromNow(3, 10, 30);
  const openTrip = await prisma.tripRequest.create({
    data: {
      customerId: customer.id,
      pickupAddress: "Aeroporto de Lisboa (LIS), Lisboa",
      pickupLat: 38.7756,
      pickupLng: -9.1354,
      dropoffAddress: "Praça do Comércio, Lisboa",
      dropoffLat: 38.7075,
      dropoffLng: -9.1364,
      pickupAt: openPickup,
      passengers: 2,
      luggage: 2,
      notes: "Arrival flight TP1234. Name board: Ana.",
      flightNumber: "TP1234",
      status: "OPEN",
      preferredVehicleClassId: "vc_executive",
      currency: "EUR",
      expiresAt: new Date(openPickup.getTime() - 2 * 60 * 60 * 1000),
    },
  });

  await prisma.offer.createMany({
    data: [
      {
        tripRequestId: openTrip.id,
        driverId: driver.id,
        vehicleId: carlosVehicleId,
        priceAmount: 4500,
        currency: "EUR",
        message: "Includes 60 min waiting time and bottled water.",
        includesTolls: true,
        includesWaiting: true,
        validUntil: openTrip.expiresAt!,
        status: "PENDING",
      },
      {
        tripRequestId: openTrip.id,
        driverId: driver2.id,
        vehicleId: ritaVehicleId,
        priceAmount: 5200,
        currency: "EUR",
        message: "Van available if you bring extra luggage.",
        includesTolls: true,
        includesWaiting: true,
        validUntil: openTrip.expiresAt!,
        status: "PENDING",
      },
    ],
  });

  // 2) Second OPEN trip (Cascais) — for driver browse
  const open2Pickup = daysFromNow(5, 16, 0);
  const openTrip2 = await prisma.tripRequest.create({
    data: {
      customerId: customer.id,
      pickupAddress: "Hotel Avenida Palace, Lisboa",
      pickupLat: 38.7155,
      pickupLng: -9.142,
      dropoffAddress: "Cascais Marina, Cascais",
      dropoffLat: 38.6969,
      dropoffLng: -9.4205,
      pickupAt: open2Pickup,
      passengers: 3,
      luggage: 3,
      notes: "Family transfer with child seat preference.",
      status: "OPEN",
      preferredVehicleClassId: "vc_van",
      currency: "EUR",
      expiresAt: new Date(open2Pickup.getTime() - 3 * 60 * 60 * 1000),
    },
  });

  // 3) CONFIRMED upcoming booking (Carlos)
  const confirmedPickup = daysFromNow(1, 8, 0);
  const confirmedTrip = await prisma.tripRequest.create({
    data: {
      customerId: customer.id,
      pickupAddress: "Estação do Oriente, Lisboa",
      pickupLat: 38.7679,
      pickupLng: -9.099,
      dropoffAddress: "Sintra National Palace, Sintra",
      dropoffLat: 38.7974,
      dropoffLng: -9.3905,
      pickupAt: confirmedPickup,
      passengers: 2,
      luggage: 1,
      notes: "Return not needed.",
      status: "CONFIRMED",
      preferredVehicleClassId: "vc_executive",
      currency: "EUR",
      expiresAt: confirmedPickup,
    },
  });

  const confirmedOffer = await prisma.offer.create({
    data: {
      tripRequestId: confirmedTrip.id,
      driverId: driver.id,
      vehicleId: carlosVehicleId,
      priceAmount: 6800,
      currency: "EUR",
      message: "Meet at main entrance.",
      includesTolls: true,
      includesWaiting: false,
      status: "ACCEPTED",
    },
  });

  await prisma.tripRequest.update({
    where: { id: confirmedTrip.id },
    data: { acceptedOfferId: confirmedOffer.id },
  });

  const confirmedBooking = await prisma.booking.create({
    data: {
      tripRequestId: confirmedTrip.id,
      offerId: confirmedOffer.id,
      customerId: customer.id,
      driverId: driver.id,
      status: "PAID",
      totalAmount: 6800,
      currency: "EUR",
      platformFeeAmount: 1020,
      confirmedAt: hoursFromNow(-20),
      payment: {
        create: {
          provider: "NONE",
          amount: 6800,
          currency: "EUR",
          status: "CAPTURED",
          rawPayload: JSON.stringify({ demo: true, mode: "auto-confirm" }),
        },
      },
    },
  });

  // 4) IN_PROGRESS trip (Rita)
  const progressPickup = hoursFromNow(-1);
  const progressTrip = await prisma.tripRequest.create({
    data: {
      customerId: customer.id,
      pickupAddress: "Aeroporto de Faro (FAO), Faro",
      pickupLat: 37.0144,
      pickupLng: -7.9659,
      dropoffAddress: "Marina de Lagos, Lagos",
      dropoffLat: 37.1014,
      dropoffLng: -8.6744,
      pickupAt: progressPickup,
      passengers: 4,
      luggage: 5,
      flightNumber: "TP1902",
      status: "IN_PROGRESS",
      preferredVehicleClassId: "vc_van",
      currency: "EUR",
      expiresAt: progressPickup,
    },
  });

  const progressOffer = await prisma.offer.create({
    data: {
      tripRequestId: progressTrip.id,
      driverId: driver2.id,
      vehicleId: ritaVehicleId,
      priceAmount: 12500,
      currency: "EUR",
      message: "Door-to-door Algarve transfer.",
      includesTolls: true,
      includesWaiting: true,
      status: "ACCEPTED",
    },
  });

  await prisma.tripRequest.update({
    where: { id: progressTrip.id },
    data: { acceptedOfferId: progressOffer.id },
  });

  await prisma.booking.create({
    data: {
      tripRequestId: progressTrip.id,
      offerId: progressOffer.id,
      customerId: customer.id,
      driverId: driver2.id,
      status: "PAID",
      totalAmount: 12500,
      currency: "EUR",
      platformFeeAmount: 1875,
      confirmedAt: hoursFromNow(-5),
      payment: {
        create: {
          provider: "NONE",
          amount: 12500,
          currency: "EUR",
          status: "CAPTURED",
        },
      },
    },
  });

  // 5) COMPLETED + review (Carlos)
  const donePickup = daysFromNow(-4, 14, 0);
  const doneTrip = await prisma.tripRequest.create({
    data: {
      customerId: customer.id,
      pickupAddress: "Chiado, Lisboa",
      pickupLat: 38.7108,
      pickupLng: -9.1427,
      dropoffAddress: "Aeroporto de Lisboa (LIS), Lisboa",
      dropoffLat: 38.7756,
      dropoffLng: -9.1354,
      pickupAt: donePickup,
      passengers: 1,
      luggage: 2,
      flightNumber: "TP456",
      notes: "Departures terminal 1.",
      status: "COMPLETED",
      preferredVehicleClassId: "vc_executive",
      currency: "EUR",
      expiresAt: donePickup,
    },
  });

  const doneOffer = await prisma.offer.create({
    data: {
      tripRequestId: doneTrip.id,
      driverId: driver.id,
      vehicleId: carlosVehicleId,
      priceAmount: 3800,
      currency: "EUR",
      includesTolls: true,
      includesWaiting: false,
      status: "ACCEPTED",
    },
  });

  await prisma.tripRequest.update({
    where: { id: doneTrip.id },
    data: { acceptedOfferId: doneOffer.id },
  });

  await prisma.booking.create({
    data: {
      tripRequestId: doneTrip.id,
      offerId: doneOffer.id,
      customerId: customer.id,
      driverId: driver.id,
      status: "COMPLETED",
      totalAmount: 3800,
      currency: "EUR",
      platformFeeAmount: 570,
      confirmedAt: daysFromNow(-5),
      payment: {
        create: {
          provider: "NONE",
          amount: 3800,
          currency: "EUR",
          status: "CAPTURED",
        },
      },
      review: {
        create: {
          fromUserId: customer.id,
          toUserId: driver.id,
          rating: 5,
          comment: "Punctual, immaculate car, calm drive to the airport.",
        },
      },
    },
  });

  // 6) CANCELLED sample
  await prisma.tripRequest.create({
    data: {
      customerId: customer.id,
      pickupAddress: "Belém Tower, Lisboa",
      dropoffAddress: "Parque das Nações, Lisboa",
      pickupAt: daysFromNow(-1, 11, 0),
      passengers: 2,
      luggage: 1,
      status: "CANCELLED",
      preferredVehicleClassId: "vc_sedan",
      currency: "EUR",
      notes: "Plans changed — cancelled by customer.",
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: customer.id,
        type: "OFFER_RECEIVED",
        title: "New offers on your LIS transfer",
        body: "Carlos and Rita sent proposals for Aeroporto → Praça do Comércio.",
      },
      {
        userId: driver.id,
        type: "BOOKING_CONFIRMED",
        title: "Trip confirmed · Sintra",
        body: "Ana Cliente confirmed your €68 offer. Contacts are unlocked.",
      },
      {
        userId: admin.id,
        type: "DRIVER_SUBMITTED",
        title: "Verification queue",
        body: "João Pendente submitted documents for AI + admin review.",
      },
    ],
  });

  console.log("Movio seed complete — rich demo dataset.");
  console.log("Accounts (password: movio123):");
  console.log(`  Admin:      ${admin.email}`);
  console.log(`  Customer:   ${customer.email}`);
  console.log(`  Driver:     ${driver.email}`);
  console.log(`  Driver 2:   ${driver2.email}`);
  console.log(`  Pending:    ${pending.email}`);
  console.log("Sample trips:");
  console.log(`  OPEN (2 offers):     ${openTrip.id}`);
  console.log(`  OPEN (no offers):    ${openTrip2.id}`);
  console.log(`  CONFIRMED:           ${confirmedTrip.id} / booking ${confirmedBooking.id}`);
  console.log(`  IN_PROGRESS:         ${progressTrip.id}`);
  console.log(`  COMPLETED+review:    ${doneTrip.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
