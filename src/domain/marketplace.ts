import { prisma } from "@/lib/db";
import { eurosToCents, calcPlatformFee } from "@/lib/money";
import { resolveCommissionPercent } from "@/lib/commission";
import { getPaymentProvider } from "@/lib/payments/provider";
import { assertActiveVehicleClass } from "@/domain/vehicle-class";
import type { TripStatus } from "@prisma/client";
import {
  notifyOfferAccepted,
  notifyOfferReceived,
  notifyPaymentConfirmed,
  notifyTripCompleted,
  notifyTripCreated,
  notifyTripStarted,
} from "@/lib/email/notifications";

export class DomainError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function safeNotify(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (err) {
    console.error(`[notify:${label}]`, err);
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

  const trip = await prisma.tripRequest.create({
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

  if (input.publish) {
    await safeNotify("trip_created", () =>
      notifyTripCreated({
        customerId: trip.customerId,
        tripId: trip.id,
        pickup: trip.pickupAddress,
        dropoff: trip.dropoffAddress,
      }),
    );
  }

  return trip;
}

export async function publishTrip(tripId: string, customerId: string) {
  const trip = await prisma.tripRequest.findUnique({ where: { id: tripId } });
  if (!trip || trip.customerId !== customerId) {
    throw new DomainError("NOT_FOUND", "Pedido não encontrado");
  }
  if (trip.status !== "DRAFT") {
    throw new DomainError("INVALID_STATE", "Só rascunhos podem ser publicados");
  }
  const updated = await prisma.tripRequest.update({
    where: { id: tripId },
    data: { status: "OPEN" },
  });
  await safeNotify("trip_created", () =>
    notifyTripCreated({
      customerId: updated.customerId,
      tripId: updated.id,
      pickup: updated.pickupAddress,
      dropoff: updated.dropoffAddress,
    }),
  );
  return updated;
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

  return prisma.$transaction(async (tx) => {
    await tx.offer.updateMany({
      where: { tripRequestId: tripId, status: "PENDING" },
      data: { status: "EXPIRED" },
    });

    if (trip.acceptedOfferId) {
      const booking = await tx.booking.findUnique({
        where: { tripRequestId: tripId },
      });
      if (booking && booking.status !== "CANCELLED") {
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: "CANCELLED" },
        });
      }
    }

    return tx.tripRequest.update({
      where: { id: tripId },
      data: { status: "CANCELLED" },
    });
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
  const driver = await prisma.user.findUnique({
    where: { id: input.driverId },
    include: { driverProfile: { include: { vehicles: true } } },
  });
  if (!driver?.driverProfile) {
    throw new DomainError("FORBIDDEN", "Perfil de motorista em falta");
  }
  if (driver.driverProfile.status !== "ACTIVE") {
    throw new DomainError("FORBIDDEN", "Motorista ainda não verificado");
  }

  const trip = await prisma.tripRequest.findUnique({
    where: { id: input.tripRequestId },
  });
  if (!trip || trip.status !== "OPEN") {
    throw new DomainError("INVALID_STATE", "Pedido não está aberto a propostas");
  }

  const vehicleId =
    input.vehicleId || driver.driverProfile.vehicles[0]?.id || null;
  if (!vehicleId) {
    throw new DomainError("VEHICLE_REQUIRED", "Regista um veículo primeiro");
  }

  const priceAmount = eurosToCents(input.priceEuros);
  const validUntil = trip.expiresAt;

  const existing = await prisma.offer.findFirst({
    where: {
      tripRequestId: input.tripRequestId,
      driverId: input.driverId,
      status: "PENDING",
    },
  });

  if (existing) {
    const updated = await prisma.offer.update({
      where: { id: existing.id },
      data: {
        vehicleId,
        priceAmount,
        message: input.message || null,
        includesTolls: input.includesTolls ?? true,
        includesWaiting: input.includesWaiting ?? false,
        estimatedArrivalMinutes: input.estimatedArrivalMinutes ?? null,
        validUntil,
      },
    });
    await safeNotify("offer_received", () =>
      notifyOfferReceived({
        customerId: trip.customerId,
        tripId: trip.id,
        offerId: updated.id,
        priceAmount: updated.priceAmount,
        currency: updated.currency,
      }),
    );
    return updated;
  }

  const created = await prisma.offer.create({
    data: {
      tripRequestId: input.tripRequestId,
      driverId: input.driverId,
      vehicleId,
      priceAmount,
      currency: trip.currency,
      message: input.message || null,
      includesTolls: input.includesTolls ?? true,
      includesWaiting: input.includesWaiting ?? false,
      estimatedArrivalMinutes: input.estimatedArrivalMinutes ?? null,
      validUntil,
      status: "PENDING",
    },
  });
  await safeNotify("offer_received", () =>
    notifyOfferReceived({
      customerId: trip.customerId,
      tripId: trip.id,
      offerId: created.id,
      priceAmount: created.priceAmount,
      currency: created.currency,
    }),
  );
  return created;
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
  return prisma.$transaction(async (tx) => {
    const trip = await tx.tripRequest.findUnique({ where: { id: tripId } });
    if (!trip || trip.customerId !== customerId) {
      throw new DomainError("NOT_FOUND", "Pedido não encontrado");
    }
    if (trip.status !== "OPEN") {
      throw new DomainError("INVALID_STATE", "Pedido não está aberto");
    }

    const offer = await tx.offer.findUnique({ where: { id: offerId } });
    if (!offer || offer.tripRequestId !== tripId || offer.status !== "PENDING") {
      throw new DomainError("INVALID_OFFER", "Proposta inválida");
    }
    if (offer.validUntil && offer.validUntil < new Date()) {
      throw new DomainError("EXPIRED", "Proposta expirada");
    }

    await tx.offer.update({
      where: { id: offerId },
      data: { status: "ACCEPTED" },
    });
    await tx.offer.updateMany({
      where: {
        tripRequestId: tripId,
        status: "PENDING",
        id: { not: offerId },
      },
      data: { status: "REJECTED" },
    });

    const vehicle = offer.vehicleId
      ? await tx.vehicle.findUnique({
          where: { id: offer.vehicleId },
          select: { vehicleClassId: true },
        })
      : null;
    const feePercent = await resolveCommissionPercent({
      currency: offer.currency,
      vehicleClassId: vehicle?.vehicleClassId,
    });
    const fee = calcPlatformFee(offer.priceAmount, feePercent);

    const booking = await tx.booking.create({
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

    await tx.payment.create({
      data: {
        bookingId: booking.id,
        provider: "NONE",
        amount: offer.priceAmount,
        currency: offer.currency,
        status: "REQUIRES_PAYMENT",
      },
    });

    const updatedTrip = await tx.tripRequest.update({
      where: { id: tripId },
      data: {
        status: "OFFER_ACCEPTED",
        acceptedOfferId: offer.id,
      },
    });

    await tx.notification.create({
      data: {
        userId: offer.driverId,
        type: "OFFER_ACCEPTED",
        title: "Proposta aceite",
        body: "O cliente aceitou a tua proposta na ZRIK.",
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

    return { trip: updatedTrip, booking, paymentResult, driverId: offer.driverId };
  }).then(async (result) => {
    await safeNotify("offer_accepted", () =>
      notifyOfferAccepted({
        driverId: result.driverId,
        tripId,
        offerId,
      }),
    );
    return result;
  });
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

  return prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "PAID", confirmedAt: new Date() },
    });
    await tx.payment.update({
      where: { bookingId },
      data: {
        status: "CAPTURED",
        provider: paymentsEnabled() ? "STRIPE" : "MANUAL",
        rawPayload: JSON.stringify({
          demo: !paymentsEnabled(),
          mode: paymentsEnabled() ? "stripe_ready" : "sandbox_confirm",
          at: new Date().toISOString(),
        }),
      },
    });
    await tx.tripRequest.update({
      where: { id: booking.tripRequestId },
      data: { status: "CONFIRMED" },
    });
    await tx.notification.create({
      data: {
        userId: booking.driverId,
        type: "BOOKING_CONFIRMED",
        title: "Viagem confirmada",
        body: "O pagamento foi confirmado. Prepare-se para o encontro.",
        meta: JSON.stringify({ bookingId, tripId: booking.tripRequestId }),
      },
    });
    return booking;
  }).then(async (paid) => {
    await safeNotify("payment_confirmed", () =>
      notifyPaymentConfirmed({
        customerId: paid.customerId,
        driverId: paid.driverId,
        tripId: paid.tripRequestId,
        bookingId: paid.id,
        amount: paid.totalAmount,
        currency: paid.currency,
      }),
    );
    return paid;
  });
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
  const booking = trip.booking;
  const allowed =
    role === "ADMIN" ||
    booking.driverId === actorId ||
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

  const updated = await prisma.tripRequest.update({
    where: { id: tripId },
    data: { status: next },
  });

  if (next === "IN_PROGRESS") {
    await safeNotify("trip_started", () =>
      notifyTripStarted({
        customerId: trip.customerId,
        driverId: booking.driverId,
        tripId,
      }),
    );
  }

  return updated;
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

  return prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: trip.booking!.id },
      data: { status: "COMPLETED" },
    });
    return tx.tripRequest.update({
      where: { id: tripId },
      data: { status: "COMPLETED" },
    });
  }).then(async (completed) => {
    await safeNotify("trip_completed", () =>
      notifyTripCompleted({
        customerId: trip.customerId,
        driverId: trip.booking!.driverId,
        tripId,
      }),
    );
    return completed;
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

  return prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        bookingId: booking.id,
        fromUserId: input.fromUserId,
        toUserId: booking.driverId,
        rating: input.rating,
        vehicleRating: input.vehicleRating ?? null,
        comment: input.comment || null,
      },
    });

    const agg = await tx.review.aggregate({
      where: { toUserId: booking.driverId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await tx.driverProfile.updateMany({
      where: { userId: booking.driverId },
      data: {
        ratingAvg: agg._avg.rating ?? input.rating,
        ratingCount: agg._count.rating,
      },
    });

    if (input.vehicleRating != null && booking.offer.vehicleId) {
      const vAgg = await tx.review.aggregate({
        where: {
          vehicleRating: { not: null },
          booking: { offer: { vehicleId: booking.offer.vehicleId } },
        },
        _avg: { vehicleRating: true },
        _count: { vehicleRating: true },
      });
      await tx.vehicle.update({
        where: { id: booking.offer.vehicleId },
        data: {
          ratingAvg: vAgg._avg.vehicleRating ?? input.vehicleRating,
          ratingCount: vAgg._count.vehicleRating,
        },
      });
    }

    await tx.notification.create({
      data: {
        userId: booking.driverId,
        type: "REVIEW_RECEIVED",
        title: "Nova avaliação",
        body: `Recebeste ${input.rating}★ na ZRIK.`,
        meta: JSON.stringify({ bookingId: booking.id, rating: input.rating }),
      },
    });

    return review;
  });
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
