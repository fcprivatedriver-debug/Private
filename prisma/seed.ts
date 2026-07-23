import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  CUSTOMER_PHOTOS,
  DEMO_CUSTOMERS,
  DEMO_DRIVERS,
  DOC_TYPES,
  DRIVER_PHOTOS,
  REVIEW_COMMENTS,
  ROUTES,
  VEHICLE_CLASSES,
} from "./demo-catalog";

const prisma = new PrismaClient();

function daysAgo(d: number, hour = 12, minute = 0) {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  dt.setHours(hour, minute, 0, 0);
  return dt;
}

function daysFromNow(d: number, hour = 10, minute = 0) {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  dt.setHours(hour, minute, 0, 0);
  return dt;
}

function hoursFromNow(h: number) {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length]!;
}

function fee(amount: number, percent = 15) {
  return Math.round((amount * percent) / 100);
}

async function clearDemoData() {
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
}

async function seedSettings() {
  await prisma.platformSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      defaultCurrency: "EUR",
      defaultCommissionPercent: 15,
      supportedCurrencies: JSON.stringify(["EUR"]),
      demoMode: true,
    },
    update: {
      defaultCurrency: "EUR",
      defaultCommissionPercent: 15,
      supportedCurrencies: JSON.stringify(["EUR"]),
      demoMode: true,
    },
  });

  await prisma.commissionRule.create({
    data: { name: "Default marketplace", percent: 15, priority: 0 },
  });

  for (const vc of VEHICLE_CLASSES) {
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
}

type DriverBundle = {
  userId: string;
  profileId: string;
  vehicleId: string;
  email: string;
  name: string;
  active: boolean;
};

async function seedDrivers(passwordHash: string): Promise<DriverBundle[]> {
  const bundles: DriverBundle[] = [];

  for (let i = 0; i < DEMO_DRIVERS.length; i++) {
    const spec = DEMO_DRIVERS[i]!;
    const approved = spec.onboardingStatus === "APPROVED";
    const completeness =
      approved || spec.onboardingStatus === "UNDER_REVIEW" || spec.onboardingStatus === "SUBMITTED"
        ? 90 + (i % 10)
        : spec.onboardingStatus === "NEEDS_INFO"
          ? 72
          : 40;

    const user = await prisma.user.create({
      data: {
        email: spec.email,
        name: spec.name,
        role: "DRIVER",
        passwordHash,
        phone: spec.phone,
        locale: spec.locale,
        image: pick(DRIVER_PHOTOS, i),
        driverProfile: {
          create: {
            status: spec.status,
            onboardingStatus: spec.onboardingStatus,
            onboardingStep: approved ? "done" : spec.onboardingStatus === "NEEDS_INFO" ? "documents" : "review",
            completenessScore: Math.min(100, completeness),
            photoUrl: pick(DRIVER_PHOTOS, i),
            bio: spec.bio,
            languagesSpoken: JSON.stringify(spec.languages),
            yearsOfExperience: spec.years,
            ratingAvg: approved ? 4.4 + (i % 6) * 0.1 : null,
            ratingCount: approved ? 8 + (i % 20) : 0,
            completedTripsCount: approved ? 20 + i * 7 : 0,
            responseRate: approved ? 86 + (i % 12) : null,
            avgResponseTimeMinutes: approved ? 8 + (i % 20) : null,
            aiRiskScore: approved ? 12 + (i % 20) : 28 + (i % 25),
            aiConfidence: 75 + (i % 20),
            aiSummary: approved
              ? `AI recommends approval for ${spec.name}.`
              : `AI review pending for ${spec.name}.`,
            documents: JSON.stringify([{ type: "license", status: approved ? "verified" : "pending" }]),
            verifiedAt: approved ? daysAgo(60 - i) : null,
            submittedAt: daysAgo(Math.max(1, 14 - (i % 10))),
            infoRequestMessage:
              spec.onboardingStatus === "NEEDS_INFO"
                ? "Please upload a renewed insurance certificate."
                : null,
            rejectionReason:
              spec.onboardingStatus === "REJECTED"
                ? "Repeated late cancellations and incomplete documents."
                : null,
            vehicles: {
              create: {
                make: spec.vehicle.make,
                model: spec.vehicle.model,
                year: spec.vehicle.year,
                color: spec.vehicle.color,
                plate: spec.vehicle.plate,
                seats: spec.vehicle.seats,
                luggageCapacity: spec.vehicle.luggage,
                vehicleClassId: spec.vehicle.classId,
                photoUrls: JSON.stringify([pick(DRIVER_PHOTOS, i)]),
                ratingAvg: approved ? 4.3 + (i % 7) * 0.1 : null,
                ratingCount: approved ? 5 + (i % 15) : 0,
              },
            },
          },
        },
      },
      include: { driverProfile: { include: { vehicles: true } } },
    });

    const profile = user.driverProfile!;
    const vehicle = profile.vehicles[0]!;

    for (const type of DOC_TYPES) {
      const flagged = !approved && type === "INSURANCE" && i % 3 === 0;
      await prisma.driverDocument.create({
        data: {
          driverProfileId: profile.id,
          type,
          status: approved ? "APPROVED" : flagged ? "AI_FLAGGED" : "AI_PASSED",
          fileName: `${type.toLowerCase()}_${i}.pdf`,
          mimeType: type === "PROFILE_PHOTO" ? "image/jpeg" : "application/pdf",
          sizeBytes: 80_000 + i * 1200,
          storageKey: `demo/${profile.id}/${type.toLowerCase()}`,
          url: `/api/uploads/demo/${type.toLowerCase()}`,
          aiScore: flagged ? 55 : 82 + (i % 15),
          aiFlags: flagged ? JSON.stringify(["expiry_within_30_days"]) : "[]",
          aiAnalysis: JSON.stringify({ readable: true, demo: true }),
          reviewedAt: approved ? daysAgo(40) : null,
        },
      });
    }

    await prisma.verificationReview.create({
      data: {
        driverProfileId: profile.id,
        source: "AI",
        decision: approved ? "APPROVE" : spec.onboardingStatus === "NEEDS_INFO" ? "REQUEST_INFO" : "ESCALATE",
        riskScore: approved ? 12 + (i % 15) : 30 + (i % 20),
        confidence: 78 + (i % 15),
        recommendation: approved ? "APPROVE" : "Manual review recommended",
        findings: JSON.stringify([{ code: "DEMO_SEED", severity: "low" }]),
        notes: `Seeded verification for ${spec.name}`,
      },
    });

    bundles.push({
      userId: user.id,
      profileId: profile.id,
      vehicleId: vehicle.id,
      email: user.email,
      name: user.name,
      active: spec.status === "ACTIVE",
    });
  }

  return bundles;
}

async function seedCustomers(passwordHash: string) {
  const customers = [];
  for (let i = 0; i < DEMO_CUSTOMERS.length; i++) {
    const c = DEMO_CUSTOMERS[i]!;
    const user = await prisma.user.create({
      data: {
        email: c.email,
        name: c.name,
        role: "CUSTOMER",
        passwordHash,
        phone: c.phone,
        locale: c.locale,
        image: pick(CUSTOMER_PHOTOS, i),
        customerProfile: {
          create: {
            defaultCurrency: "EUR",
            ratingAvg: 4.5 + (i % 5) * 0.1,
          },
        },
      },
    });
    customers.push(user);
  }
  return customers;
}

async function createCompletedTrip(opts: {
  customerId: string;
  driverUserId: string;
  vehicleId: string;
  routeIndex: number;
  dayOffset: number;
  priceJitter: number;
}) {
  const route = pick(ROUTES, opts.routeIndex);
  const pickupAt = daysAgo(opts.dayOffset, 8 + (opts.routeIndex % 10), (opts.dayOffset * 7) % 60);
  const price = route.basePrice + opts.priceJitter;

  const trip = await prisma.tripRequest.create({
    data: {
      customerId: opts.customerId,
      pickupAddress: route.pickup,
      pickupLat: route.plat,
      pickupLng: route.plng,
      dropoffAddress: route.dropoff,
      dropoffLat: route.dlat,
      dropoffLng: route.dlng,
      pickupAt,
      passengers: 1 + (opts.routeIndex % 4),
      luggage: 1 + (opts.routeIndex % 3),
      notes: opts.routeIndex % 4 === 0 ? "Name board requested." : null,
      flightNumber: opts.routeIndex % 3 === 0 ? `TP${1000 + opts.routeIndex}` : null,
      status: "COMPLETED",
      preferredVehicleClassId: route.classId,
      currency: "EUR",
      expiresAt: pickupAt,
      distanceMeters: 8000 + (opts.routeIndex % 20) * 1500,
      durationSeconds: 900 + (opts.routeIndex % 20) * 120,
    },
  });

  const offer = await prisma.offer.create({
    data: {
      tripRequestId: trip.id,
      driverId: opts.driverUserId,
      vehicleId: opts.vehicleId,
      priceAmount: price,
      currency: "EUR",
      message: "Thank you for choosing Movio.",
      includesTolls: true,
      includesWaiting: opts.routeIndex % 2 === 0,
      status: "ACCEPTED",
      estimatedArrivalMinutes: 15 + (opts.routeIndex % 20),
    },
  });

  await prisma.tripRequest.update({
    where: { id: trip.id },
    data: { acceptedOfferId: offer.id },
  });

  const rating = 4 + (opts.routeIndex % 2);
  const booking = await prisma.booking.create({
    data: {
      tripRequestId: trip.id,
      offerId: offer.id,
      customerId: opts.customerId,
      driverId: opts.driverUserId,
      status: "COMPLETED",
      totalAmount: price,
      currency: "EUR",
      platformFeeAmount: fee(price),
      confirmedAt: new Date(pickupAt.getTime() - 24 * 60 * 60 * 1000),
      payment: {
        create: {
          provider: opts.routeIndex % 5 === 0 ? "MANUAL" : "NONE",
          providerPaymentId: `demo_pay_${trip.id.slice(-8)}`,
          amount: price,
          currency: "EUR",
          status: "CAPTURED",
          rawPayload: JSON.stringify({ demo: true, mode: "captured" }),
        },
      },
      review: {
        create: {
          fromUserId: opts.customerId,
          toUserId: opts.driverUserId,
          rating,
          vehicleRating: Math.max(4, rating - (opts.routeIndex % 2)),
          comment: pick(REVIEW_COMMENTS, opts.routeIndex + opts.dayOffset),
        },
      },
    },
  });

  return { trip, offer, booking, rating, vehicleId: opts.vehicleId };
}

async function recomputeRatings(activeDrivers: DriverBundle[]) {
  for (const d of activeDrivers) {
    const reviews = await prisma.review.findMany({
      where: { toUserId: d.userId },
      select: { rating: true, booking: { select: { offer: { select: { vehicleId: true } } } } },
    });
    if (reviews.length === 0) continue;
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    await prisma.driverProfile.update({
      where: { id: d.profileId },
      data: {
        ratingAvg: Math.round(avg * 10) / 10,
        ratingCount: reviews.length,
        completedTripsCount: reviews.length,
      },
    });

    const byVehicle = new Map<string, number[]>();
    for (const r of reviews) {
      const vid = r.booking.offer.vehicleId;
      if (!vid) continue;
      const list = byVehicle.get(vid) || [];
      list.push(r.rating);
      byVehicle.set(vid, list);
    }
    for (const [vehicleId, ratings] of byVehicle) {
      const vAvg = ratings.reduce((s, n) => s + n, 0) / ratings.length;
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
          ratingAvg: Math.round(vAvg * 10) / 10,
          ratingCount: ratings.length,
        },
      });
    }
  }
}

async function seedLiveMarketplace(
  anaId: string,
  drivers: DriverBundle[],
  customers: { id: string }[],
) {
  const carlos = drivers.find((d) => d.email === "motorista@movio.app")!;
  const rita = drivers.find((d) => d.email === "motorista2@movio.app")!;
  const actives = drivers.filter((d) => d.active);

  const openPickup = daysFromNow(3, 10, 30);
  const openTrip = await prisma.tripRequest.create({
    data: {
      customerId: anaId,
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
      distanceMeters: 9800,
      durationSeconds: 1680,
    },
  });

  await prisma.offer.createMany({
    data: [
      {
        tripRequestId: openTrip.id,
        driverId: carlos.userId,
        vehicleId: carlos.vehicleId,
        priceAmount: 4500,
        currency: "EUR",
        message: "Includes 60 min waiting time and bottled water.",
        includesTolls: true,
        includesWaiting: true,
        validUntil: openTrip.expiresAt!,
        status: "PENDING",
        estimatedArrivalMinutes: 22,
      },
      {
        tripRequestId: openTrip.id,
        driverId: rita.userId,
        vehicleId: rita.vehicleId,
        priceAmount: 5200,
        currency: "EUR",
        message: "Van available if you bring extra luggage.",
        includesTolls: true,
        includesWaiting: true,
        validUntil: openTrip.expiresAt!,
        status: "PENDING",
        estimatedArrivalMinutes: 28,
      },
      {
        tripRequestId: openTrip.id,
        driverId: actives[3]!.userId,
        vehicleId: actives[3]!.vehicleId,
        priceAmount: 4800,
        currency: "EUR",
        message: "Executive sedan, water and Wi‑Fi.",
        includesTolls: true,
        includesWaiting: true,
        validUntil: openTrip.expiresAt!,
        status: "PENDING",
        estimatedArrivalMinutes: 18,
      },
    ],
  });

  const open2 = daysFromNow(5, 16, 0);
  await prisma.tripRequest.create({
    data: {
      customerId: anaId,
      pickupAddress: "Hotel Avenida Palace, Lisboa",
      dropoffAddress: "Cascais Marina, Cascais",
      pickupLat: 38.715,
      pickupLng: -9.142,
      dropoffLat: 38.692,
      dropoffLng: -9.418,
      pickupAt: open2,
      passengers: 3,
      luggage: 3,
      notes: "Family transfer with child seat preference.",
      status: "OPEN",
      preferredVehicleClassId: "vc_van",
      currency: "EUR",
      expiresAt: new Date(open2.getTime() - 3 * 60 * 60 * 1000),
      distanceMeters: 28500,
      durationSeconds: 2400,
    },
  });

  // Extra open trips from other customers for driver browse
  for (let i = 0; i < 6; i++) {
    const route = pick(ROUTES, i + 2);
    const when = daysFromNow(2 + i, 9 + i, 15);
    await prisma.tripRequest.create({
      data: {
        customerId: pick(customers, i + 1).id,
        pickupAddress: route.pickup,
        pickupLat: route.plat,
        pickupLng: route.plng,
        dropoffAddress: route.dropoff,
        dropoffLat: route.dlat,
        dropoffLng: route.dlng,
        pickupAt: when,
        passengers: 1 + (i % 4),
        luggage: 1 + (i % 3),
        status: "OPEN",
        preferredVehicleClassId: route.classId,
        currency: "EUR",
        expiresAt: new Date(when.getTime() - 2 * 60 * 60 * 1000),
        notes: i % 2 === 0 ? "Demo open request for marketplace density." : null,
        distanceMeters: 7000 + i * 2200,
        durationSeconds: 900 + i * 180,
      },
    });
  }

  const confirmedPickup = daysFromNow(1, 8, 0);
  const confirmedTrip = await prisma.tripRequest.create({
    data: {
      customerId: anaId,
      pickupAddress: "Estação do Oriente, Lisboa",
      dropoffAddress: "Sintra National Palace, Sintra",
      pickupLat: 38.7679,
      pickupLng: -9.099,
      dropoffLat: 38.7975,
      dropoffLng: -9.3906,
      pickupAt: confirmedPickup,
      passengers: 2,
      luggage: 1,
      notes: "Return not needed.",
      status: "CONFIRMED",
      preferredVehicleClassId: "vc_executive",
      currency: "EUR",
      expiresAt: confirmedPickup,
      distanceMeters: 26500,
      durationSeconds: 2100,
    },
  });
  const confirmedOffer = await prisma.offer.create({
    data: {
      tripRequestId: confirmedTrip.id,
      driverId: carlos.userId,
      vehicleId: carlos.vehicleId,
      priceAmount: 6800,
      currency: "EUR",
      message: "Meet at main entrance.",
      includesTolls: true,
      status: "ACCEPTED",
      estimatedArrivalMinutes: 20,
    },
  });
  await prisma.tripRequest.update({
    where: { id: confirmedTrip.id },
    data: { acceptedOfferId: confirmedOffer.id },
  });
  await prisma.booking.create({
    data: {
      tripRequestId: confirmedTrip.id,
      offerId: confirmedOffer.id,
      customerId: anaId,
      driverId: carlos.userId,
      status: "PAID",
      totalAmount: 6800,
      currency: "EUR",
      platformFeeAmount: fee(6800),
      confirmedAt: hoursFromNow(-20),
      payment: {
        create: {
          provider: "NONE",
          amount: 6800,
          currency: "EUR",
          status: "CAPTURED",
          rawPayload: JSON.stringify({ demo: true }),
        },
      },
    },
  });

  const progressPickup = hoursFromNow(-1);
  const progressTrip = await prisma.tripRequest.create({
    data: {
      customerId: anaId,
      pickupAddress: "Aeroporto de Faro (FAO), Faro",
      dropoffAddress: "Marina de Lagos, Lagos",
      pickupLat: 37.0144,
      pickupLng: -7.9659,
      dropoffLat: 37.101,
      dropoffLng: -8.673,
      pickupAt: progressPickup,
      passengers: 4,
      luggage: 5,
      flightNumber: "TP1902",
      status: "IN_PROGRESS",
      preferredVehicleClassId: "vc_van",
      currency: "EUR",
      expiresAt: progressPickup,
      distanceMeters: 92000,
      durationSeconds: 4800,
    },
  });
  const progressOffer = await prisma.offer.create({
    data: {
      tripRequestId: progressTrip.id,
      driverId: rita.userId,
      vehicleId: rita.vehicleId,
      priceAmount: 12500,
      currency: "EUR",
      message: "Door-to-door Algarve transfer.",
      includesTolls: true,
      includesWaiting: true,
      status: "ACCEPTED",
      estimatedArrivalMinutes: 35,
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
      customerId: anaId,
      driverId: rita.userId,
      status: "PAID",
      totalAmount: 12500,
      currency: "EUR",
      platformFeeAmount: fee(12500),
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

  await prisma.tripRequest.create({
    data: {
      customerId: anaId,
      pickupAddress: "Belém Tower, Lisboa",
      dropoffAddress: "Parque das Nações, Lisboa",
      pickupAt: daysAgo(1, 11, 0),
      passengers: 2,
      luggage: 1,
      status: "CANCELLED",
      preferredVehicleClassId: "vc_sedan",
      currency: "EUR",
      notes: "Plans changed — cancelled by customer.",
    },
  });

  return openTrip.id;
}

async function seedNotifications(adminId: string, anaId: string, carlosId: string, pendingCount: number) {
  const notes: Prisma.NotificationCreateManyInput[] = [
    {
      userId: anaId,
      type: "OFFER_RECEIVED",
      title: "New offers on your LIS transfer",
      body: "Multiple drivers replied to Aeroporto → Praça do Comércio.",
    },
    {
      userId: anaId,
      type: "BOOKING_CONFIRMED",
      title: "Trip confirmed · Sintra",
      body: "Your booking is paid. Driver contact is unlocked.",
      readAt: hoursFromNow(-10),
    },
    {
      userId: carlosId,
      type: "BOOKING_CONFIRMED",
      title: "Trip confirmed · Sintra",
      body: "Ana Cliente confirmed your €68 offer.",
    },
    {
      userId: carlosId,
      type: "NEW_OPEN_TRIP",
      title: "New open requests nearby",
      body: "Several Lisbon-area transfers are waiting for offers.",
    },
    {
      userId: adminId,
      type: "DRIVER_SUBMITTED",
      title: "Verification queue",
      body: `${pendingCount} drivers need review in Demo Mode.`,
    },
    {
      userId: adminId,
      type: "PLATFORM_DIGEST",
      title: "Demo Mode active",
      body: "Sample marketplace data is loaded for product review.",
    },
  ];

  // densify notifications across customers/drivers
  for (let i = 0; i < 24; i++) {
    notes.push({
      userId: i % 2 === 0 ? anaId : carlosId,
      type: i % 3 === 0 ? "OFFER_RECEIVED" : "SYSTEM",
      title: i % 3 === 0 ? "Offer activity" : "Movio update",
      body: `Demo notification #${i + 1} — marketplace looks active.`,
      readAt: i % 4 === 0 ? hoursFromNow(-i) : null,
      createdAt: hoursFromNow(-i * 3),
    });
  }

  await prisma.notification.createMany({ data: notes });
}

async function main() {
  console.log("Seeding Movio Demo Mode…");
  await clearDemoData();
  await seedSettings();

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

  const customers = await seedCustomers(passwordHash);
  const drivers = await seedDrivers(passwordHash);
  const activeDrivers = drivers.filter((d) => d.active);
  const ana = customers.find((c) => c.email === "cliente@movio.app")!;

  // Exactly 50 completed trips
  const COMPLETED = 50;
  for (let i = 0; i < COMPLETED; i++) {
    const driver = pick(activeDrivers, i);
    const customer = pick(customers, i);
    await createCompletedTrip({
      customerId: customer.id,
      driverUserId: driver.userId,
      vehicleId: driver.vehicleId,
      routeIndex: i,
      dayOffset: 2 + i,
      priceJitter: (i % 7) * 150,
    });
  }

  await recomputeRatings(activeDrivers);
  const openTripId = await seedLiveMarketplace(ana.id, drivers, customers);

  const pendingCount = await prisma.driverProfile.count({
    where: {
      OR: [
        { onboardingStatus: { in: ["SUBMITTED", "UNDER_REVIEW", "NEEDS_INFO"] } },
        { status: "PENDING_VERIFICATION" },
      ],
    },
  });

  await seedNotifications(admin.id, ana.id, drivers[0]!.userId, pendingCount);

  await prisma.auditLog.createMany({
    data: [
      {
        actorId: admin.id,
        action: "DEMO_MODE_SEEDED",
        entityType: "PlatformSettings",
        entityId: "default",
        meta: JSON.stringify({ drivers: drivers.length, completedTrips: COMPLETED }),
      },
    ],
  });

  const counts = {
    drivers: await prisma.user.count({ where: { role: "DRIVER" } }),
    vehicles: await prisma.vehicle.count(),
    completedTrips: await prisma.tripRequest.count({ where: { status: "COMPLETED" } }),
    customers: await prisma.user.count({ where: { role: "CUSTOMER" } }),
    reviews: await prisma.review.count(),
    payments: await prisma.payment.count(),
    documents: await prisma.driverDocument.count(),
    notifications: await prisma.notification.count(),
    openTrips: await prisma.tripRequest.count({ where: { status: "OPEN" } }),
  };

  console.log("Demo Mode seed complete.");
  console.log(JSON.stringify(counts, null, 2));
  console.log("Accounts (password: movio123):");
  console.log("  admin@movio.app / cliente@movio.app / motorista@movio.app");
  console.log(`  Sample OPEN trip: ${openTripId}`);
  console.log("  PlatformSettings.demoMode = true");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
