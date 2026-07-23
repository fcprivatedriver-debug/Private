import { prisma } from "@/lib/db";
import { eurosToCents, calcPlatformFee } from "@/lib/money";
import { platformFeePercent } from "@/config/env";
import { getPaymentProvider } from "@/lib/payments/provider";
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
  preferredVehicleCategory?:
    | "SEDAN"
    | "EXECUTIVE"
    | "VAN"
    | "MINIBUS"
    | "LUXURY";
  publish?: boolean;
}) {
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
      preferredVehicleCategory: input.preferredVehicleCategory || null,
      status,
      currency: "EUR",
      expiresAt,
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
    return prisma.offer.update({
      where: { id: existing.id },
      data: {
        vehicleId,
        priceAmount,
        message: input.message || null,
        includesTolls: input.includesTolls ?? true,
        includesWaiting: input.includesWaiting ?? false,
        validUntil,
      },
    });
  }

  return prisma.offer.create({
    data: {
      tripRequestId: input.tripRequestId,
      driverId: input.driverId,
      vehicleId,
      priceAmount,
      currency: trip.currency,
      message: input.message || null,
      includesTolls: input.includesTolls ?? true,
      includesWaiting: input.includesWaiting ?? false,
      validUntil,
      status: "PENDING",
    },
  });
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

    const fee = calcPlatformFee(offer.priceAmount, platformFeePercent());

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
        body: "O cliente aceitou a tua proposta na Movio.",
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
  });
}

export async function confirmBookingWithoutPayment(bookingId: string) {
  // Used when PAYMENTS_ENABLED=false — advances to CONFIRMED for demo flow
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new DomainError("NOT_FOUND", "Reserva não encontrada");

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "PAID", confirmedAt: new Date() },
    });
    await tx.payment.update({
      where: { bookingId },
      data: { status: "CAPTURED", provider: "MANUAL" },
    });
    await tx.tripRequest.update({
      where: { id: booking.tripRequestId },
      data: { status: "CONFIRMED" },
    });
    return booking;
  });
}
