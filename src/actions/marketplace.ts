"use server";

import { auth } from "@/lib/auth";
import {
  acceptOffer,
  cancelTrip,
  createOrUpdateOffer,
  createTripRequest,
  publishTrip,
  withdrawOffer,
  confirmBookingPayment,
  startTrip,
  completeTrip,
  createReview,
  advanceJourney,
} from "@/domain/marketplace";
import {
  createOfferSchema,
  createTripSchema,
  registerSchema,
  vehicleSchema,
  reviewSchema,
} from "@/lib/validators";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { refreshCompleteness, setOnboardingStep, adminDecideVerification } from "@/domain/onboarding";
import { estimateRoute } from "@/lib/maps/route";
import { toActionFailure } from "@/lib/action-errors";

function fail(error: unknown) {
  return toActionFailure(error);
}

export async function registerAction(formData: FormData) {
  try {
    const rawPhone = formData.get("phone");
    const parsed = registerSchema.parse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      phone: typeof rawPhone === "string" ? rawPhone : undefined,
      role: formData.get("role"),
    });

    const email = parsed.email.toLowerCase();
    const exists = await prisma.user.findUnique({
      where: { email },
      include: {
        customerProfile: true,
        driverProfile: true,
      },
    });

    // Same email: never create a second account — add the missing profile instead.
    if (exists) {
      if (!exists.passwordHash) {
        return {
          ok: false as const,
          error: "Este email já está registado. Entre com a sua conta.",
          code: "EMAIL_TAKEN",
        };
      }
      const valid = await bcrypt.compare(parsed.password, exists.passwordHash);
      if (!valid) {
        return {
          ok: false as const,
          error: "Este email já está registado. Entre com a palavra-passe correta para ativar o outro perfil.",
          code: "EMAIL_TAKEN",
        };
      }

      if (parsed.role === "CUSTOMER" && !exists.customerProfile) {
        await prisma.customerProfile.create({ data: { userId: exists.id } });
      }
      if (parsed.role === "DRIVER" && !exists.driverProfile) {
        await prisma.driverProfile.create({
          data: {
            userId: exists.id,
            status: "PENDING_VERIFICATION",
            onboardingStatus: "NOT_STARTED",
            onboardingStep: "profile",
            languagesSpoken: '["pt"]',
          },
        });
      }
      if (parsed.role === "DRIVER" && !exists.customerProfile) {
        await prisma.customerProfile.create({ data: { userId: exists.id } });
      }
      if (parsed.phone && !exists.phone) {
        await prisma.user.update({
          where: { id: exists.id },
          data: { phone: parsed.phone, name: exists.name || parsed.name },
        });
      }
      return { ok: true as const, existingAccount: true as const };
    }

    const passwordHash = await bcrypt.hash(parsed.password, 10);

    if (parsed.role === "CUSTOMER") {
      await prisma.user.create({
        data: {
          name: parsed.name,
          email,
          passwordHash,
          phone: parsed.phone ?? null,
          role: "CUSTOMER",
          customerProfile: { create: {} },
        },
      });
    } else {
      // Drivers also get a customer profile so one account can request trips later.
      await prisma.user.create({
        data: {
          name: parsed.name,
          email,
          passwordHash,
          phone: parsed.phone ?? null,
          role: "DRIVER",
          customerProfile: { create: {} },
          driverProfile: {
            create: {
              status: "PENDING_VERIFICATION",
              onboardingStatus: "NOT_STARTED",
              onboardingStep: "profile",
              languagesSpoken: '["pt"]',
            },
          },
        },
      });
    }

    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function createTripAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    return { ok: false as const, error: "Inicie sessão para pedir uma viagem." };
  }
  const canCustomer =
    session.user.role === "CUSTOMER" ||
    session.user.role === "ADMIN" ||
    session.user.hasCustomer ||
    session.user.activeMode === "CUSTOMER";
  if (!canCustomer && session.user.role !== "DRIVER") {
    return { ok: false as const, error: "Sem permissão para pedir viagens." };
  }
  // Ensure driver-only legacy accounts can still request trips on the same user id.
  if (session.user.role === "DRIVER" || session.user.hasDriver) {
    const profile = await prisma.customerProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!profile) {
      await prisma.customerProfile.create({ data: { userId: session.user.id } });
    }
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
      pickupLat: formData.get("pickupLat") || undefined,
      pickupLng: formData.get("pickupLng") || undefined,
      dropoffLat: formData.get("dropoffLat") || undefined,
      dropoffLng: formData.get("dropoffLng") || undefined,
      distanceMeters: formData.get("distanceMeters") || undefined,
      durationSeconds: formData.get("durationSeconds") || undefined,
    });

    let coords = {
      pickupLat: parsed.pickupLat,
      pickupLng: parsed.pickupLng,
      dropoffLat: parsed.dropoffLat,
      dropoffLng: parsed.dropoffLng,
      distanceMeters: parsed.distanceMeters,
      durationSeconds: parsed.durationSeconds,
    };

    if (!coords.distanceMeters || !coords.pickupLat) {
      const estimate = await estimateRoute({
        pickupAddress: parsed.pickupAddress,
        dropoffAddress: parsed.dropoffAddress,
        pickupLat: parsed.pickupLat,
        pickupLng: parsed.pickupLng,
        dropoffLat: parsed.dropoffLat,
        dropoffLng: parsed.dropoffLng,
      });
      if (!estimate) {
        return {
          ok: false as const,
          error:
            "Não foi possível calcular a distância e duração desta viagem. Confirme as moradas e tente novamente.",
        };
      }
      coords = {
        pickupLat: estimate.pickup.lat,
        pickupLng: estimate.pickup.lng,
        dropoffLat: estimate.dropoff.lat,
        dropoffLng: estimate.dropoff.lng,
        distanceMeters: estimate.distanceMeters,
        durationSeconds: estimate.durationSeconds,
      };
    }

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
      ...coords,
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
      estimatedArrivalMinutes: formData.get("estimatedArrivalMinutes") || undefined,
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
    return {
      ok: true as const,
      bookingId: result.booking.id,
      tripId,
      next: `/pedidos/${tripId}/pagamento` as const,
    };
  } catch (error) {
    return fail(error);
  }
}

export async function confirmPaymentAction(bookingId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMER") {
    return { ok: false as const, error: "Sem permissão" };
  }
  try {
    const booking = await confirmBookingPayment(bookingId, session.user.id);
    return {
      ok: true as const,
      tripId: booking.tripRequestId,
      next: `/pedidos/${booking.tripRequestId}/confirmacao` as const,
    };
  } catch (error) {
    return fail(error);
  }
}

export async function advanceJourneyAction(
  tripId: string,
  next: "DRIVER_EN_ROUTE" | "DRIVER_ARRIVED" | "IN_PROGRESS",
) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Sem permissão" };
  try {
    await advanceJourney(tripId, session.user.id, session.user.role, next);
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function upsertVehicleAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Inicie sessão para continuar." };
  }
  try {
    const parsed = vehicleSchema.parse({
      make: formData.get("make"),
      model: formData.get("model"),
      year: formData.get("year"),
      color: formData.get("color"),
      plate: formData.get("plate"),
      seats: formData.get("seats") || 4,
      luggageCapacity: formData.get("luggageCapacity") || 3,
      vehicleClassId: formData.get("vehicleClassId"),
    });
    const photoUrlsRaw = formData.get("photoUrls");
    const photoUrls =
      typeof photoUrlsRaw === "string" && photoUrlsRaw.trim()
        ? photoUrlsRaw
        : undefined;

    const profile = await prisma.driverProfile.findUnique({
      where: { userId: session.user.id },
      include: { vehicles: true },
    });
    if (!profile) {
      return {
        ok: false as const,
        error: "Ative o perfil de motorista nesta conta para continuar.",
      };
    }

    const vehicleClass = await prisma.vehicleClass.findFirst({
      where: { id: parsed.vehicleClassId, active: true },
    });
    if (!vehicleClass) return { ok: false as const, error: "Classe de veículo inválida" };

    if (profile.vehicles[0]) {
      await prisma.vehicle.update({
        where: { id: profile.vehicles[0].id },
        data: {
          ...parsed,
          ...(photoUrls ? { photoUrls } : {}),
        },
      });
    } else {
      await prisma.vehicle.create({
        data: {
          ...parsed,
          driverId: profile.id,
          photoUrls: photoUrls || "[]",
        },
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
    const parsed = reviewSchema.parse({
      bookingId: formData.get("bookingId"),
      rating: formData.get("rating"),
      vehicleRating: formData.get("vehicleRating") || undefined,
      comment: formData.get("comment") || undefined,
    });
    await createReview({
      bookingId: parsed.bookingId,
      fromUserId: session.user.id,
      rating: parsed.rating,
      vehicleRating: parsed.vehicleRating,
      comment: parsed.comment,
    });
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}
