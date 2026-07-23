"use server";

import { auth } from "@/lib/auth";
import {
  acceptOffer,
  cancelTrip,
  createOrUpdateOffer,
  createTripRequest,
  publishTrip,
  withdrawOffer,
  DomainError,
  confirmBookingWithoutPayment,
  startTrip,
  completeTrip,
  createReview,
} from "@/domain/marketplace";
import {
  createOfferSchema,
  createTripSchema,
  registerSchema,
  vehicleSchema,
} from "@/lib/validators";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { paymentsEnabled } from "@/config/env";
import { refreshCompleteness, setOnboardingStep, adminDecideVerification } from "@/domain/onboarding";

function fail(error: unknown) {
  if (error instanceof DomainError) {
    return { ok: false as const, error: error.message, code: error.code };
  }
  console.error(error);
  return { ok: false as const, error: "Erro inesperado", code: "INTERNAL" };
}

export async function registerAction(formData: FormData) {
  try {
    const parsed = registerSchema.parse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      phone: formData.get("phone") || undefined,
      role: formData.get("role"),
    });

    const exists = await prisma.user.findUnique({
      where: { email: parsed.email.toLowerCase() },
    });
    if (exists) {
      return { ok: false as const, error: "Email já registado" };
    }

    const passwordHash = await bcrypt.hash(parsed.password, 10);
    await prisma.user.create({
      data: {
        name: parsed.name,
        email: parsed.email.toLowerCase(),
        passwordHash,
        phone: parsed.phone || null,
        role: parsed.role,
        ...(parsed.role === "CUSTOMER"
          ? { customerProfile: { create: {} } }
          : {
              driverProfile: {
                create: { status: "PENDING_VERIFICATION", onboardingStatus: "NOT_STARTED" },
              },
            }),
      },
    });

    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function createTripAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMER") {
    return { ok: false as const, error: "Sem permissão" };
  }

  try {
    const parsed = createTripSchema.parse({
      pickupAddress: formData.get("pickupAddress"),
      dropoffAddress: formData.get("dropoffAddress"),
      pickupAt: formData.get("pickupAt"),
      passengers: formData.get("passengers"),
      luggage: formData.get("luggage"),
      notes: formData.get("notes") || undefined,
      flightNumber: formData.get("flightNumber") || undefined,
      preferredVehicleClassId:
        formData.get("preferredVehicleClassId") || undefined,
      publish: formData.get("publish") === "true",
    });

    const trip = await createTripRequest({
      customerId: session.user.id,
      pickupAddress: parsed.pickupAddress,
      dropoffAddress: parsed.dropoffAddress,
      pickupAt: new Date(parsed.pickupAt),
      passengers: parsed.passengers,
      luggage: parsed.luggage,
      notes: parsed.notes,
      flightNumber: parsed.flightNumber,
      preferredVehicleClassId: parsed.preferredVehicleClassId,
      publish: parsed.publish,
    });

    return { ok: true as const, tripId: trip.id };
  } catch (error) {
    return fail(error);
  }
}

export async function publishTripAction(tripId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMER") {
    return { ok: false as const, error: "Sem permissão" };
  }
  try {
    await publishTrip(tripId, session.user.id);
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function cancelTripAction(tripId: string) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Sem permissão" };
  try {
    await cancelTrip(tripId, session.user.id, session.user.role);
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function createOfferAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") {
    return { ok: false as const, error: "Sem permissão" };
  }
  try {
    const parsed = createOfferSchema.parse({
      tripRequestId: formData.get("tripRequestId"),
      vehicleId: formData.get("vehicleId") || undefined,
      priceEuros: formData.get("priceEuros"),
      message: formData.get("message") || undefined,
      includesTolls: formData.get("includesTolls") === "on",
      includesWaiting: formData.get("includesWaiting") === "on",
    });
    const offer = await createOrUpdateOffer({
      driverId: session.user.id,
      ...parsed,
    });
    return { ok: true as const, offerId: offer.id };
  } catch (error) {
    return fail(error);
  }
}

export async function withdrawOfferAction(offerId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") {
    return { ok: false as const, error: "Sem permissão" };
  }
  try {
    await withdrawOffer(offerId, session.user.id);
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function acceptOfferAction(tripId: string, offerId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMER") {
    return { ok: false as const, error: "Sem permissão" };
  }
  try {
    const result = await acceptOffer(tripId, offerId, session.user.id);
    if (!paymentsEnabled()) {
      await confirmBookingWithoutPayment(result.booking.id);
    }
    return { ok: true as const, bookingId: result.booking.id };
  } catch (error) {
    return fail(error);
  }
}

export async function upsertVehicleAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") {
    return { ok: false as const, error: "Sem permissão" };
  }
  try {
    const parsed = vehicleSchema.parse({
      make: formData.get("make"),
      model: formData.get("model"),
      year: formData.get("year"),
      color: formData.get("color"),
      plate: formData.get("plate"),
      seats: formData.get("seats"),
      luggageCapacity: formData.get("luggageCapacity"),
      vehicleClassId: formData.get("vehicleClassId"),
    });

    const profile = await prisma.driverProfile.findUnique({
      where: { userId: session.user.id },
      include: { vehicles: true },
    });
    if (!profile) return { ok: false as const, error: "Perfil em falta" };

    const vehicleClass = await prisma.vehicleClass.findFirst({
      where: { id: parsed.vehicleClassId, active: true },
    });
    if (!vehicleClass) return { ok: false as const, error: "Classe de veículo inválida" };

    if (profile.vehicles[0]) {
      await prisma.vehicle.update({
        where: { id: profile.vehicles[0].id },
        data: parsed,
      });
    } else {
      await prisma.vehicle.create({
        data: { ...parsed, driverId: profile.id },
      });
    }
    await setOnboardingStep(session.user.id, "vehicle");
    await refreshCompleteness(profile.id);
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function verifyDriverAction(driverProfileId: string, approve: boolean) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { ok: false as const, error: "Sem permissão" };
  }
  try {
    await adminDecideVerification({
      driverProfileId,
      adminUserId: session.user.id,
      decision: approve ? "APPROVE" : "REJECT",
      notes: approve ? "Approved from admin dashboard" : "Rejected from admin dashboard",
    });
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function startTripAction(tripId: string) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Sem permissão" };
  try {
    await startTrip(tripId, session.user.id, session.user.role);
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function completeTripAction(tripId: string) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Sem permissão" };
  try {
    await completeTrip(tripId, session.user.id, session.user.role);
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function createReviewAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMER") {
    return { ok: false as const, error: "Sem permissão" };
  }
  try {
    const bookingId = String(formData.get("bookingId") || "");
    const rating = Number(formData.get("rating"));
    const comment = String(formData.get("comment") || "") || undefined;
    await createReview({
      bookingId,
      fromUserId: session.user.id,
      rating,
      comment,
    });
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}
