import { hash } from "bcryptjs";
import {
  PrismaClient,
  Role,
  AccountStatus,
  SubscriptionStatus,
  TripStatus,
  TripType,
  AssignmentStatus,
  MinuteTxnType,
  PaymentKind,
  PaymentMethodType,
  PaymentStatus,
  NotificationChannel,
  NotificationStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "fcpd123";

async function main() {
  console.log("Seeding FC Private Driver demo data…");

  await prisma.minuteTransaction.deleteMany();
  await prisma.extraCharge.deleteMany();
  await prisma.tripTimer.deleteMany();
  await prisma.tripAssignment.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.adminAuditLog.deleteMany();
  await prisma.customerTravelHabit.deleteMany();
  await prisma.address.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.driverProfile.deleteMany();
  await prisma.customerProfile.deleteMany();
  await prisma.emailConfirmToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.extraMinutePackage.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.siteSettings.deleteMany();

  await prisma.siteSettings.create({
    data: {
      id: "default",
      brandName: "FC Private Driver",
      supportEmail: "fcprivatedriver@gmail.com",
      supportPhone: "+351 933 239 595",
      whatsappNumber: "+351933239595",
      toleranceMinutes: 10,
      minimumChargeMinutes: 15,
      lowBalanceThreshold: 60,
      demoMode: true,
      heroTitlePt: "O seu motorista privado, sempre que precisar.",
      heroSubtitlePt:
        "Escolha o seu plano mensal, marque as suas viagens e deixe o resto connosco. Sem procurar motoristas. Sem preços dinâmicos. Sem complicações.",
      termsHtmlPt: `<h1>Termos e Condições</h1>
<p>A FC Private Driver presta serviços de motorista privado por subscrição mensal.</p>
<p>Os minutos incluídos no plano são válidos durante o mês da subscrição e não transitam automaticamente para o mês seguinte.</p>
<p>O serviço depende de marcação e disponibilidade. Portagens, estacionamento e entradas em aeroportos não estão incluídos nos minutos.</p>`,
      privacyHtmlPt: `<h1>Política de Privacidade</h1>
<p>Tratamos os seus dados pessoais de acordo com o RGPD, apenas para prestação do serviço, faturação e comunicação.</p>
<p>Contacto: fcprivatedriver@gmail.com · +351 933 239 595</p>`,
    },
  });

  const planPrivado = await prisma.plan.create({
    data: {
      code: "privado",
      namePt: "Plano Privado",
      nameEn: "Private Plan",
      descriptionPt: "300 minutos mensais · equivalente a 5 horas",
      descriptionEn: "300 monthly minutes · equivalent to 5 hours",
      priceCents: 9900,
      monthlyMinutes: 300,
      equivalentHours: 5,
      sortOrder: 1,
      featuresJson: JSON.stringify([
        "300 minutos mensais",
        "Renovação mensal",
        "Atendimento personalizado",
        "Agendamento antecipado",
      ]),
    },
  });

  const planPlus = await prisma.plan.create({
    data: {
      code: "privado-plus",
      namePt: "Plano Privado Plus",
      nameEn: "Private Plus Plan",
      descriptionPt: "600 minutos mensais · equivalente a 10 horas",
      descriptionEn: "600 monthly minutes · equivalent to 10 hours",
      priceCents: 19900,
      monthlyMinutes: 600,
      equivalentHours: 10,
      sortOrder: 2,
      featuresJson: JSON.stringify([
        "600 minutos mensais",
        "Renovação mensal",
        "Prioridade de marcação",
        "Apoio direto por WhatsApp",
      ]),
    },
  });

  await prisma.extraMinutePackage.createMany({
    data: [
      {
        code: "extra-30",
        namePt: "30 minutos adicionais",
        nameEn: "30 extra minutes",
        minutes: 30,
        priceCents: 1500,
        sortOrder: 1,
      },
      {
        code: "extra-60",
        namePt: "60 minutos adicionais",
        nameEn: "60 extra minutes",
        minutes: 60,
        priceCents: 2800,
        sortOrder: 2,
      },
      {
        code: "extra-120",
        namePt: "120 minutos adicionais",
        nameEn: "120 extra minutes",
        minutes: 120,
        priceCents: 5000,
        sortOrder: 3,
      },
    ],
  });

  const passwordHash = await hash(DEMO_PASSWORD, 12);

  const admin = await prisma.user.create({
    data: {
      email: "admin@fcprivatedriver.demo",
      name: "Administrador FC",
      phone: "+351933239595",
      role: Role.ADMIN,
      status: AccountStatus.ACTIVE,
      emailVerified: new Date(),
      passwordHash,
    },
  });

  const customer = await prisma.user.create({
    data: {
      email: "cliente@fcprivatedriver.demo",
      name: "Ana Silva",
      phone: "+351910000001",
      role: Role.CUSTOMER,
      status: AccountStatus.ACTIVE,
      emailVerified: new Date(),
      passwordHash,
      customerProfile: {
        create: {
          fullName: "Ana Silva",
          addressLine: "Av. da Liberdade 100",
          postalCode: "1250-096",
          city: "Lisboa",
          birthDate: new Date("1988-04-12"),
          taxId: "100000001",
          phone: "+351910000001",
          profileComplete: true,
          habitsComplete: true,
          travelHabits: {
            create: {
              tripsCount: 8,
              frequencyUnit: "mes",
              weekdays: JSON.stringify(["seg", "qua", "sex"]),
              usualTimes: "08:00–09:30 e 18:00–19:30",
              usualPickups: "Av. da Liberdade, Lisboa",
              usualDestinations: "Aeroporto Humberto Delgado; Parque das Nações",
              oftenAirport: true,
              oftenRoundTrip: true,
              needsWaiting: false,
              travelsAlone: false,
              avgPassengers: 2,
              needsChildSeat: false,
              oftenLuggage: true,
              otherPreferences: "Prefere viatura discreta e pontualidade.",
            },
          },
        },
      },
    },
  });

  const driver = await prisma.user.create({
    data: {
      email: "motorista@fcprivatedriver.demo",
      name: "Carlos Mendes",
      phone: "+351933239595",
      role: Role.DRIVER,
      status: AccountStatus.ACTIVE,
      emailVerified: new Date(),
      passwordHash,
      image: "/brand/fc-icon.svg",
      driverProfile: {
        create: {
          photoUrl: "/brand/fc-icon.svg",
          phone: "+351933239595",
          active: true,
          bio: "Motorista principal da FC Private Driver. Serviço discreto e pontual.",
          availability: JSON.stringify({
            mon: true,
            tue: true,
            wed: true,
            thu: true,
            fri: true,
            sat: true,
            sun: false,
          }),
          vehicles: {
            create: {
              make: "Mercedes-Benz",
              model: "Classe E",
              plate: "AA-00-FC",
              color: "Preto",
              year: 2023,
              seats: 4,
              photoUrl: "/brand/fc-hero.jpg",
            },
          },
        },
      },
    },
    include: { driverProfile: true },
  });

  const periodStart = new Date();
  periodStart.setDate(1);
  periodStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const subscription = await prisma.subscription.create({
    data: {
      userId: customer.id,
      planId: planPrivado.id,
      status: SubscriptionStatus.ACTIVE,
      periodStart,
      periodEnd,
      nextRenewalAt: periodEnd,
      minutesIncluded: 300,
      minutesUsed: 85,
      minutesReserved: 40,
      autoRenew: true,
    },
  });

  await prisma.payment.create({
    data: {
      userId: customer.id,
      subscriptionId: subscription.id,
      kind: PaymentKind.SUBSCRIPTION,
      amountCents: planPrivado.priceCents,
      method: PaymentMethodType.CARD,
      status: PaymentStatus.PAID,
      provider: "demo",
      providerPaymentId: "demo_pay_sub_001",
      paidAt: periodStart,
      periodStart,
      periodEnd,
      invoiceUrl: "#",
      receiptUrl: "#",
    },
  });

  // Minute ledger
  await prisma.minuteTransaction.create({
    data: {
      userId: customer.id,
      subscriptionId: subscription.id,
      type: MinuteTxnType.PLAN_RENEWAL,
      minutes: 300,
      balanceAfter: 300,
      reason: "Renovação do Plano Privado",
      actorId: admin.id,
    },
  });

  const completedTrip1 = await prisma.trip.create({
    data: {
      customerId: customer.id,
      subscriptionId: subscription.id,
      status: TripStatus.COMPLETED,
      tripType: TripType.ONE_WAY,
      pickupAddress: "Av. da Liberdade 100, Lisboa",
      pickupLat: 38.7209,
      pickupLng: -9.1455,
      dropoffAddress: "Aeroporto Humberto Delgado, Lisboa",
      dropoffLat: 38.7756,
      dropoffLng: -9.1354,
      scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      passengers: 1,
      luggage: 2,
      estimatedMinutes: 35,
      reservedMinutes: 0,
      chargedMinutes: 42,
      confirmedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 42 * 60 * 1000),
      distanceMeters: 9800,
      durationSeconds: 2100,
      assignments: {
        create: {
          driverId: driver.driverProfile!.id,
          driverUserId: driver.id,
          status: AssignmentStatus.ACCEPTED,
          assignedById: admin.id,
          respondedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      timer: {
        create: {
          scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          driverArrivedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          endedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 42 * 60 * 1000),
          waitingMinutes: 0,
          tripMinutes: 42,
          totalMinutes: 42,
        },
      },
    },
  });

  await prisma.minuteTransaction.create({
    data: {
      userId: customer.id,
      subscriptionId: subscription.id,
      tripId: completedTrip1.id,
      type: MinuteTxnType.TRIP_COMPLETED,
      minutes: -42,
      balanceAfter: 258,
      reason: "Viagem concluída — Aeroporto",
    },
  });

  const completedTrip2 = await prisma.trip.create({
    data: {
      customerId: customer.id,
      subscriptionId: subscription.id,
      status: TripStatus.COMPLETED,
      tripType: TripType.ROUND_TRIP,
      pickupAddress: "Av. da Liberdade 100, Lisboa",
      dropoffAddress: "Cascais Marina, Cascais",
      scheduledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      passengers: 2,
      luggage: 1,
      needsWaiting: true,
      estimatedWaitMinutes: 60,
      estimatedMinutes: 45,
      chargedMinutes: 43,
      confirmedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000),
      distanceMeters: 28000,
      durationSeconds: 2400,
      assignments: {
        create: {
          driverId: driver.driverProfile!.id,
          driverUserId: driver.id,
          status: AssignmentStatus.ACCEPTED,
          assignedById: admin.id,
          respondedAt: new Date(),
        },
      },
      timer: {
        create: {
          scheduledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          endedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 43 * 60 * 1000),
          waitingMinutes: 0,
          tripMinutes: 43,
          totalMinutes: 43,
        },
      },
    },
  });

  await prisma.minuteTransaction.create({
    data: {
      userId: customer.id,
      subscriptionId: subscription.id,
      tripId: completedTrip2.id,
      type: MinuteTxnType.TRIP_COMPLETED,
      minutes: -43,
      balanceAfter: 215,
      reason: "Viagem concluída — Cascais",
    },
  });

  const futureTrip = await prisma.trip.create({
    data: {
      customerId: customer.id,
      subscriptionId: subscription.id,
      status: TripStatus.CONFIRMED,
      tripType: TripType.ONE_WAY,
      pickupAddress: "Av. da Liberdade 100, Lisboa",
      pickupLat: 38.7209,
      pickupLng: -9.1455,
      dropoffAddress: "Estação do Oriente, Lisboa",
      dropoffLat: 38.7679,
      dropoffLng: -9.0996,
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      passengers: 1,
      luggage: 1,
      estimatedMinutes: 40,
      reservedMinutes: 40,
      confirmedAt: new Date(),
      distanceMeters: 8500,
      durationSeconds: 1800,
      assignments: {
        create: {
          driverId: driver.driverProfile!.id,
          driverUserId: driver.id,
          status: AssignmentStatus.ACCEPTED,
          assignedById: admin.id,
          respondedAt: new Date(),
        },
      },
    },
  });

  await prisma.minuteTransaction.create({
    data: {
      userId: customer.id,
      subscriptionId: subscription.id,
      tripId: futureTrip.id,
      type: MinuteTxnType.RESERVATION,
      minutes: -40,
      balanceAfter: 175,
      reason: "Minutos reservados — viagem futura",
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: customer.id,
        channel: NotificationChannel.IN_APP,
        type: "TRIP_CONFIRMED",
        title: "Viagem confirmada",
        body: "A sua viagem para Estação do Oriente foi confirmada.",
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      },
      {
        userId: customer.id,
        channel: NotificationChannel.IN_APP,
        type: "TRIP_COMPLETED",
        title: "Viagem concluída",
        body: "Viagem concluída. Foram utilizados 43 minutos. Tem agora 215 minutos disponíveis (antes da reserva).",
        status: NotificationStatus.READ,
        readAt: new Date(),
        sentAt: new Date(),
      },
      {
        userId: driver.id,
        channel: NotificationChannel.IN_APP,
        type: "TRIP_ASSIGNED",
        title: "Nova viagem atribuída",
        body: "Tem uma viagem confirmada em breve para Estação do Oriente.",
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      },
    ],
  });

  console.log("Seed complete.");
  console.log("Demo password:", DEMO_PASSWORD);
  console.log("Admin:    admin@fcprivatedriver.demo");
  console.log("Customer: cliente@fcprivatedriver.demo");
  console.log("Driver:   motorista@fcprivatedriver.demo");
  console.log("Plans:", planPrivado.code, planPlus.code);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
