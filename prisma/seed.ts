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
  await prisma.driverProfile.deleteMany();
  await prisma.customerProfile.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("movio123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@movio.app",
      name: "Admin Movio",
      role: "ADMIN",
      passwordHash,
      phone: "+351900000001",
    },
  });

  const customer = await prisma.user.create({
    data: {
      email: "cliente@movio.app",
      name: "Ana Cliente",
      role: "CUSTOMER",
      passwordHash,
      phone: "+351910000001",
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
      driverProfile: {
        create: {
          status: "ACTIVE",
          bio: "Motorista executivo com 8 anos de experiência em transferes aeroporto.",
          languages: "pt,en,es",
          ratingAvg: 4.9,
          ratingCount: 42,
          verifiedAt: new Date(),
          vehicles: {
            create: {
              make: "Mercedes-Benz",
              model: "E-Class",
              year: 2023,
              color: "Preto",
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
      driverProfile: {
        create: {
          status: "ACTIVE",
          bio: "Especialista em transfers Lisboa–Algarve.",
          languages: "pt,en",
          ratingAvg: 4.7,
          ratingCount: 28,
          verifiedAt: new Date(),
          vehicles: {
            create: {
              make: "Volkswagen",
              model: "Caravelle",
              year: 2022,
              color: "Prata",
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
      driverProfile: {
        create: {
          status: "PENDING_VERIFICATION",
          bio: "À espera de verificação.",
          vehicles: {
            create: {
              make: "BMW",
              model: "5 Series",
              year: 2021,
              color: "Azul",
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
      notes: "Chegada do voo TP1234. Placa com nome Ana.",
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
      message: "Inclui 60 min de espera e água a bordo.",
      includesTolls: true,
      includesWaiting: true,
      validUntil: trip.expiresAt,
      status: "PENDING",
    },
  });

  console.log("Seed Movio concluído.");
  console.log("Contas (password: movio123):");
  console.log(`  Admin:      ${admin.email}`);
  console.log(`  Cliente:    ${customer.email}`);
  console.log(`  Motorista:  ${driver.email}`);
  console.log(`  Motorista2: ${driver2.email}`);
  console.log(`  Pendente:   ${pendingDriver.email}`);
  console.log(`  Pedido demo OPEN: ${trip.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
