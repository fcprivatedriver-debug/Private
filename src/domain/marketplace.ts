import { prisma } from "@/lib/db";
import { eurosToCents, calcPlatformFee } from "@/lib/money";
import { resolveCommissionPercent } from "@/lib/commission";
import { getPaymentProvider } from "@/lib/payments/provider";
import { assertActiveVehicleClass } from "@/domain/vehicle-class";
import type { TripStatus } from "@prisma/client";

export class DomainError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export async function createTripRequest(input: {
  customerId: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupAt: Date;
  passengers: number;
  luggage: number;
  notes?: string;
  flightNumber?: string;
  preferredVehicleClassId?: string;
  publish?: boolean;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  distanceMeters?: number;
  durationSeconds?: number;
}) {
  if (input.preferredVehicleClassId) {
    await assertActiveVehicleClass(input.preferredVehicleClassId);
  }

  const expiresAt = new Date(input.pickupAt.getTime() - 2 * 60 * 60 * 1000);
  const status: TripStatus = input.publish ? "OPEN" : "DRAFT";

  return prisma.tripRequest.create({
    data: {
      customerId: input.customerId,
      pickupAddress: input.pickupAddress,
      dropoffAddress: input.dropoffAddress,
      pickupAt: input.pickupAt,
      passengers: input.passengers,
      luggage: input.luggage,
      notes: input.notes || null,
      flightNumber: input.flightNumber || null,
      preferredVehicleClassId: input.preferredVehicleClassId || null,
      status,
      currency: "EUR",
      expiresAt,
      pickupLat: input.pickupLat ?? null,
      pickupLng: input.pickupLng ?? null,
      dropoffLat: input.dropoffLat ?? null,
      dropoffLng: input.dropoffLng ?? null,
      distanceMeters: input.distanceMeters ?? null,
      durationSeconds: input.durationSeconds ?? null,
    },
  });
}

export async function publishTrip(tripId: string, customerId: string) {
  const trip = await prisma.tripRequest.findUnique({ where: { id: tripId } });
  if (!trip || trip.customerId !== customerId) {
    throw new DomainError("NOT_FOUND", "Pedido não encontrado");
  }
  if (trip.status !== "DRAFT") {
    throw new DomainError("INVALID_STATE", "Só rascunhos podem ser publicados");
  }
  return prisma.tripRequest.update({
    where: { id: tripId },
    data: { status: "OPEN" },
  });
}

export async function cancelTrip(tripId: string, userId: string, role: string) {
  const trip = await prisma.tripRequest.findUnique({ where: { id: tripId } });
  if (!trip) throw new DomainError("NOT_FOUND", "Pedido não encontrado");
  if (role !== "ADMIN" && trip.customerId !== userId) {
    throw new DomainError("FORBIDDEN", "Sem permissão");
  }
  if (["COMPLETED", "CANCELLED", "EXPIRED"].includes(trip.status)) {
    throw new DomainError("INVALID_STATE", "Pedido já fechado");
  }

  // Neon HTTP: no interactive transactions — sequential writes.
  await prisma.offer.updateMany({
    where: { tripRequestId: tripId, status: "PENDING" },
    data: { status: "EXPIRED" },
  });

  if (trip.acceptedOfferId) {
    const booking = await prisma.booking.findUnique({
      where: { tripRequestId: tripId },
    });
    if (booking && booking.status !== "CANCELLED") {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: "CANCELLED" },
      });
    }
  }

  return prisma.tripRequest.update({
    where: { id: tripId },
    data: { status: "CANCELLED" },
  });
}

export async function createOrUpdateOffer(input: {
  driverId: string;
  tripRequestId: string;
  vehicleId?: string;
  priceEuros: number;
  message?: string;
  includesTolls?: boolean;
  includesWaiting?: boolean;
  estimatedArrivalMinutes?: number;
}) {
  const { moderateOfferMessage, MessageModerationError } = await import(
    "@/lib/message-moderation"
  );
  const { createNotification } = await import("@/lib/notifications");
  const { shortRouteLabel } = await import("@/lib/location-label");

  let safeMessage: string | null = null;
  try {
    safeMessage = moderateOfferMessage(input.message);
  } catch (error) {
    if (error instanceof MessageModerationError) {
      throw new DomainError(error.code, error.message);
    }
    throw error;
  }

  const driver = await prisma.user.findUnique({
    where: { id: input.driverId },
    include: { driverProfile: { include: { vehicles: true } } },
  });
  if (!driver?.driverProfile) {
    throw new DomainError("FORBIDDEN", "Perfil de motorista em falta");
  }
  if (driver.driverProfile.status !== "ACTIVE") {
    throw new DomainError(
      "FORBIDDEN",
      "Complete a verificação de documentos antes de enviar propostas",
    );
  }

  const trip = await prisma.tripRequest.findUnique({
    where: { id: input.tripRequestId },
  });
  if (!trip || trip.status !== "OPEN") {
    throw new DomainError("INVALID_STATE", "Pedido não está aberto a propostas");
  }
  if (trip.customerId === input.driverId) {
    throw new DomainError("FORBIDDEN", "Não pode propor na sua própria viagem");
  }

  const vehicleId =
    input.vehicleId || driver.driverProfile.vehicles[0]?.id || null;
  if (!vehicleId) {
    throw new DomainError("VEHICLE_REQUIRED", "Regista um veículo primeiro");
  }

  // Ensure the vehicle belongs to this driver
  const ownsVehicle = driver.driverProfile.vehicles.some((v) => v.id === vehicleId);
  if (!ownsVehicle) {
    throw new DomainError("FORBIDDEN", "Veículo inválido");
  }

  const priceAmount = eurosToCents(input.priceEuros);
  const validUntil = trip.expiresAt;

  const existing = await prisma.offer.findFirst({
    where: {
      tripRequestId: input.tripRequestId,
      driverId: input.driverId,
      status: { in: ["PENDING", "ACCEPTED"] },
    },
  });

  let offer;
  let isNew = false;
  if (existing) {
    if (existing.status === "ACCEPTED") {
      throw new DomainError("INVALID_STATE", "Esta proposta já foi aceite");
    }
    offer = await prisma.offer.update({
      where: { id: existing.id },
      data: {
        vehicleId,
        priceAmount,
        message: safeMessage,
        includesTolls: input.includesTolls ?? true,
        includesWaiting: input.includesWaiting ?? false,
        estimatedArrivalMinutes: input.estimatedArrivalMinutes ?? null,
        validUntil,
      },
    });
  } else {
    isNew = true;
    offer = await prisma.offer.create({
      data: {
        tripRequestId: input.tripRequestId,
        driverId: input.driverId,
        vehicleId,
        priceAmount,
        currency: trip.currency,
        message: safeMessage,
        includesTolls: input.includesTolls ?? true,
        includesWaiting: input.includesWaiting ?? false,
        estimatedArrivalMinutes: input.estimatedArrivalMinutes ?? null,
        validUntil,
        status: "PENDING",
      },
    });
  }

  // In-app notification for the customer (does not depend on Resend)
  if (isNew) {
    const route = shortRouteLabel(trip.pickupAddress, trip.dropoffAddress);
    try {
      await createNotification({
        userId: trip.customerId,
        type: "OFFER_RECEIVED",
        title: "Nova proposta recebida",
        body: `Recebeu uma nova proposta para ${route}.`,
        meta: {
          tripId: trip.id,
          offerId: offer.id,
          href: `/pedidos/${trip.id}`,
        },
      });
    } catch (err) {
      console.error("[notifyOfferReceived]", err);
    }
  }

  return offer;
}

export async function withdrawOffer(offerId: string, driverId: string) {
  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!offer || offer.driverId !== driverId) {
    throw new DomainError("NOT_FOUND", "Proposta não encontrada");
  }
  if (offer.status !== "PENDING") {
    throw new DomainError("INVALID_STATE", "Só propostas pendentes podem ser retiradas");
  }
  return prisma.offer.update({
    where: { id: offerId },
    data: { status: "WITHDRAWN" },
  });
}

export async function acceptOffer(tripId: string, offerId: string, customerId: string) {
  // Neon HTTP: sequential writes (no interactive $transaction).
  const trip = await prisma.tripRequest.findUnique({ where: { id: tripId } });
  if (!trip || trip.customerId !== customerId) {
    throw new DomainError("NOT_FOUND", "Pedido não encontrado");
  }
  if (trip.status !== "OPEN") {
    throw new DomainError("INVALID_STATE", "Pedido não está aberto");
  }

  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!offer || offer.tripRequestId !== tripId || offer.status !== "PENDING") {
    throw new DomainError("INVALID_OFFER", "Proposta inválida");
  }
  if (offer.validUntil && offer.validUntil < new Date()) {
    throw new DomainError("EXPIRED", "Proposta expirada");
  }

  await prisma.offer.update({
    where: { id: offerId },
    data: { status: "ACCEPTED" },
  });
  await prisma.offer.updateMany({
    where: {
      tripRequestId: tripId,
      status: "PENDING",
      id: { not: offerId },
    },
    data: { status: "REJECTED" },
  });

  const vehicle = offer.vehicleId
    ? await prisma.vehicle.findUnique({
        where: { id: offer.vehicleId },
        select: { vehicleClassId: true },
      })
    : null;
  const feePercent = await resolveCommissionPercent({
    currency: offer.currency,
    vehicleClassId: vehicle?.vehicleClassId,
  });
  const fee = calcPlatformFee(offer.priceAmount, feePercent);

  const booking = await prisma.booking.create({
    data: {
      tripRequestId: tripId,
      offerId: offer.id,
      customerId,
      driverId: offer.driverId,
      status: "PENDING_PAYMENT",
      totalAmount: offer.priceAmount,
      currency: offer.currency,
      platformFeeAmount: fee,
    },
  });

  await prisma.payment.create({
    data: {
      bookingId: booking.id,
      provider: "NONE",
      amount: offer.priceAmount,
      currency: offer.currency,
      status: "REQUIRES_PAYMENT",
    },
  });

  const updatedTrip = await prisma.tripRequest.update({
    where: { id: tripId },
    data: {
      status: "OFFER_ACCEPTED",
      acceptedOfferId: offer.id,
    },
  });

  await prisma.notification.create({
    data: {
      userId: offer.driverId,
      type: "OFFER_ACCEPTED",
      title: "Proposta aceite",
      body: "O cliente aceitou a tua proposta na Tripvo.",
      meta: JSON.stringify({ tripId, offerId, bookingId: booking.id }),
    },
  });

  const paymentResult = await getPaymentProvider().createPaymentIntent({
    bookingId: booking.id,
    amount: offer.priceAmount,
    currency: offer.currency,
    customerEmail: "",
    platformFeeAmount: fee,
  });

  return { trip: updatedTrip, booking, paymentResult };
}

export async function confirmBookingWithoutPayment(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new DomainError("NOT_FOUND", "Reserva não encontrada");
  return confirmBookingPayment(bookingId, booking.customerId);
}

export async function confirmBookingPayment(bookingId: string, customerId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true, tripRequest: true },
  });
  if (!booking || booking.customerId !== customerId) {
    throw new DomainError("NOT_FOUND", "Reserva não encontrada");
  }
  if (booking.status !== "PENDING_PAYMENT") {
    throw new DomainError("INVALID_STATE", "Pagamento já processado");
  }

  // Neon HTTP: sequential writes.
  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "PAID", confirmedAt: new Date() },
  });
  await prisma.payment.update({
    where: { bookingId },
    data: {
      status: "CAPTURED",
      provider: paymentsEnabled() ? "STRIPE" : "MANUAL",
      rawPayload: JSON.stringify({
        demo: !paymentsEnabled(),
        mode: paymentsEnabled() ? "stripe_ready" : "demo_confirm",
        at: new Date().toISOString(),
      }),
    },
  });
  await prisma.tripRequest.update({
    where: { id: booking.tripRequestId },
    data: { status: "CONFIRMED" },
  });
  await prisma.notification.create({
    data: {
      userId: booking.driverId,
      type: "BOOKING_CONFIRMED",
      title: "Viagem confirmada",
      body: "O pagamento foi confirmado. Prepare-se para o encontro.",
      meta: JSON.stringify({ bookingId, tripId: booking.tripRequestId }),
    },
  });
  return booking;
}

function paymentsEnabled(): boolean {
  return process.env.PAYMENTS_ENABLED === "true";
}

export async function advanceJourney(
  tripId: string,
  actorId: string,
  role: string,
  next: "DRIVER_EN_ROUTE" | "DRIVER_ARRIVED" | "IN_PROGRESS",
) {
  const trip = await prisma.tripRequest.findUnique({
    where: { id: tripId },
    include: { booking: true },
  });
  if (!trip?.booking) throw new DomainError("NOT_FOUND", "Viagem não encontrada");
  const allowed =
    role === "ADMIN" ||
    trip.booking.driverId === actorId ||
    trip.customerId === actorId;
  if (!allowed) throw new DomainError("FORBIDDEN", "Sem permissão");

  const transitions: Record<string, string[]> = {
    DRIVER_EN_ROUTE: ["CONFIRMED"],
    DRIVER_ARRIVED: ["DRIVER_EN_ROUTE", "CONFIRMED"],
    IN_PROGRESS: ["DRIVER_ARRIVED", "DRIVER_EN_ROUTE", "CONFIRMED"],
  };
  if (!transitions[next]?.includes(trip.status)) {
    throw new DomainError("INVALID_STATE", `Não é possível avançar de ${trip.status} para ${next}`);
  }

  return prisma.tripRequest.update({
    where: { id: tripId },
    data: { status: next },
  });
}

export async function startTrip(tripId: string, actorId: string, role: string) {
  return advanceJourney(tripId, actorId, role, "IN_PROGRESS");
}

export async function completeTrip(tripId: string, actorId: string, role: string) {
  const trip = await prisma.tripRequest.findUnique({
    where: { id: tripId },
    include: { booking: true },
  });
  if (!trip?.booking) throw new DomainError("NOT_FOUND", "Viagem não encontrada");
  if (!["CONFIRMED", "DRIVER_EN_ROUTE", "DRIVER_ARRIVED", "IN_PROGRESS"].includes(trip.status)) {
    throw new DomainError("INVALID_STATE", "Estado inválido para concluir");
  }
  const allowed =
    role === "ADMIN" ||
    trip.booking.driverId === actorId ||
    trip.customerId === actorId;
  if (!allowed) throw new DomainError("FORBIDDEN", "Sem permissão");

  // Neon HTTP: sequential writes.
  await prisma.booking.update({
    where: { id: trip.booking!.id },
    data: { status: "COMPLETED" },
  });
  return prisma.tripRequest.update({
    where: { id: tripId },
    data: { status: "COMPLETED" },
  });
}

export async function createReview(input: {
  bookingId: string;
  fromUserId: string;
  rating: number;
  vehicleRating?: number;
  comment?: string;
}) {
  if (input.rating < 1 || input.rating > 5) {
    throw new DomainError("VALIDATION", "Avaliação deve ser entre 1 e 5");
  }
  if (input.vehicleRating != null && (input.vehicleRating < 1 || input.vehicleRating > 5)) {
    throw new DomainError("VALIDATION", "Avaliação do veículo inválida");
  }

  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: { review: true, tripRequest: true, offer: true },
  });
  if (!booking) throw new DomainError("NOT_FOUND", "Reserva não encontrada");
  if (booking.customerId !== input.fromUserId) {
    throw new DomainError("FORBIDDEN", "Só o cliente pode avaliar no MVP");
  }
  if (booking.tripRequest.status !== "COMPLETED" && booking.status !== "COMPLETED") {
    throw new DomainError("INVALID_STATE", "Só podes avaliar após a viagem");
  }
  if (booking.review) {
    throw new DomainError("EXISTS", "Já existe uma avaliação");
  }

  // Neon HTTP: sequential writes.
  const review = await prisma.review.create({
    data: {
      bookingId: booking.id,
      fromUserId: input.fromUserId,
      toUserId: booking.driverId,
      rating: input.rating,
      vehicleRating: input.vehicleRating ?? null,
      comment: input.comment || null,
    },
  });

  const agg = await prisma.review.aggregate({
    where: { toUserId: booking.driverId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.driverProfile.updateMany({
    where: { userId: booking.driverId },
    data: {
      ratingAvg: agg._avg.rating ?? input.rating,
      ratingCount: agg._count.rating,
    },
  });

  if (input.vehicleRating != null && booking.offer.vehicleId) {
    const vAgg = await prisma.review.aggregate({
      where: {
        vehicleRating: { not: null },
        booking: { offer: { vehicleId: booking.offer.vehicleId } },
      },
      _avg: { vehicleRating: true },
      _count: { vehicleRating: true },
    });
    await prisma.vehicle.update({
      where: { id: booking.offer.vehicleId },
      data: {
        ratingAvg: vAgg._avg.vehicleRating ?? input.vehicleRating,
        ratingCount: vAgg._count.vehicleRating,
      },
    });
  }

  await prisma.notification.create({
    data: {
      userId: booking.driverId,
      type: "REVIEW_RECEIVED",
      title: "Nova avaliação",
      body: `Recebeste ${input.rating}★ na Tripvo.`,
      meta: JSON.stringify({ bookingId: booking.id, rating: input.rating }),
    },
  });

  return review;
}

export async function expireStaleTripsAndOffers(now = new Date()) {
  const expiredTrips = await prisma.tripRequest.updateMany({
    where: {
      status: "OPEN",
      OR: [{ expiresAt: { lt: now } }, { pickupAt: { lt: now } }],
    },
    data: { status: "EXPIRED" },
  });

  const expiredOffers = await prisma.offer.updateMany({
    where: {
      status: "PENDING",
      OR: [
        { validUntil: { lt: now } },
        { tripRequest: { status: { in: ["EXPIRED", "CANCELLED", "COMPLETED"] } } },
      ],
    },
    data: { status: "EXPIRED" },
  });

  return {
    expiredTrips: expiredTrips.count,
    expiredOffers: expiredOffers.count,
  };
}
