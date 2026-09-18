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
import { notifyAdminNewDriver, notifyAdminNewTrip } from "@/lib/email";
import { repairCustomerProfileColumns } from "@/lib/db-repair";

function fail(error: unknown) {
  return toActionFailure(error);
}

async function ensureCustomerProfileRow(userId: string) {
  await repairCustomerProfileColumns();
  const existing = await prisma.customerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (existing) return existing.id;
  const profileId = `cp_${userId.slice(-16)}_${Date.now().toString(36)}`;
  await prisma.$executeRawUnsafe(`
    INSERT INTO "CustomerProfile" ("id", "userId", "defaultCurrency", "createdAt", "updatedAt")
    VALUES (
      ${JSON.stringify(profileId)},
      ${JSON.stringify(userId)},
      'EUR',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("userId") DO NOTHING
  `);
  return profileId;
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
        await ensureCustomerProfileRow(exists.id);
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
        try {
          await notifyAdminNewDriver({
            userId: exists.id,
            name: exists.name || parsed.name,
            email,
            phone: parsed.phone ?? exists.phone,
          });
        } catch (err) {
          console.error("[notifyAdminNewDriver]", err);
        }
      }
      if (parsed.role === "DRIVER" && !exists.customerProfile) {
        await ensureCustomerProfileRow(exists.id);
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

    // Neon HTTP adapter: nested creates use interactive transactions and fail.
    // Create User first, then profiles as sequential single-row writes.
    const user = await prisma.user.create({
      data: {
        name: parsed.name,
        email,
        passwordHash,
        phone: parsed.phone ?? null,
        role: parsed.role,
      },
      select: { id: true, email: true, role: true, name: true },
    });

    if (!user?.id) {
      throw new Error("USER_CREATE_NO_ID");
    }

    // Heal shared Neon drift before profile inserts (non-destructive).
    await ensureCustomerProfileRow(user.id);

    if (parsed.role === "DRIVER") {
      const existingDriver = await prisma.driverProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!existingDriver) {
        await prisma.driverProfile.create({
          data: {
            userId: user.id,
            status: "PENDING_VERIFICATION",
            onboardingStatus: "NOT_STARTED",
            onboardingStep: "profile",
            languagesSpoken: '["pt"]',
          },
        });
      }
    }

    // Fire-and-forget admin notification — never block or roll back registration.
    if (parsed.role === "DRIVER") {
      try {
        await notifyAdminNewDriver({
          userId: user.id,
          name: parsed.name,
          email,
          phone: parsed.phone ?? null,
        });
      } catch (err) {
        console.error("[notifyAdminNewDriver]", err);
      }
    }

    return { ok: true as const, userId: user.id };
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
      await ensureCustomerProfileRow(session.user.id);
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

    // Admin notification after successful persist — never fail the trip create.
    void (async () => {
      try {
        const [customer, vehicleClass] = await Promise.all([
          prisma.user.findUnique({
            where: { id: session.user.id },
            select: { name: true, email: true, phone: true },
          }),
          parsed.preferredVehicleClassId
            ? prisma.vehicleClass.findUnique({
                where: { id: parsed.preferredVehicleClassId },
                select: { namePt: true, code: true },
              })
            : null,
        ]);
        await notifyAdminNewTrip({
          tripId: trip.id,
          pickupAddress: parsed.pickupAddress,
          dropoffAddress: parsed.dropoffAddress,
          pickupAt: trip.pickupAt,
          passengers: parsed.passengers,
          luggage: parsed.luggage,
          category: vehicleClass
            ? `${vehicleClass.namePt} (${vehicleClass.code})`
            : null,
          flightNumber: parsed.flightNumber,
          notes: parsed.notes,
          customerName: customer?.name || session.user.name || "—",
          customerEmail: customer?.email || session.user.email,
          customerPhone: customer?.phone ?? null,
        });
      } catch (err) {
        console.error("[notifyAdminNewTrip]", err);
      }
    })();

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
