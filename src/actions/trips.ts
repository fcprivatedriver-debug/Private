"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  applyMinimumCharge,
  getActiveSubscription,
  reserveTripMinutes,
  settleTripMinutes,
  applyMinuteTransaction,
  computeAvailable,
} from "@/lib/minutes/ledger";
import { notify } from "@/lib/notifications";
import { getSiteSettings } from "@/lib/session";
import type { ActionState } from "@/actions/auth";
import { estimateRoute } from "@/lib/maps/route";

export async function createTripAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState & { tripId?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão inválida." };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.emailVerified) {
    return { error: "Confirme o e-mail antes de marcar viagens." };
  }

  const sub = await getActiveSubscription(session.user.id);
  if (!sub) return { error: "Precisa de um plano ativo para marcar viagens." };

  const pickupAddress = String(formData.get("pickupAddress") || "");
  const dropoffAddress = String(formData.get("dropoffAddress") || "");
  const date = String(formData.get("date") || "");
  const time = String(formData.get("time") || "");
  const mode = String(formData.get("mode") || "schedule"); // request | schedule

  if (!pickupAddress || !dropoffAddress || !date || !time) {
    return { error: "Preencha origem, destino, data e hora." };
  }

  const scheduledAt = new Date(`${date}T${time}:00`);
  if (Number.isNaN(scheduledAt.getTime())) return { error: "Data/hora inválida." };

  const settings = await getSiteSettings();
  let distanceMeters: number | undefined;
  let durationSeconds: number | undefined;
  let estimatedMinutes = settings.minimumChargeMinutes;

  try {
    const route = await estimateRoute(pickupAddress, dropoffAddress);
    if (route) {
      distanceMeters = route.distanceMeters;
      durationSeconds = route.durationSeconds;
      estimatedMinutes = applyMinimumCharge(
        Math.ceil(route.durationSeconds / 60),
        settings.minimumChargeMinutes,
      );
    }
  } catch {
    // Maps optional in demo
  }

  const needsWaiting = formData.get("needsWaiting") === "on";
  const estimatedWaitMinutes = Number(formData.get("estimatedWaitMinutes") || 0) || null;
  if (needsWaiting && estimatedWaitMinutes) {
    estimatedMinutes += estimatedWaitMinutes;
  }

  const available = computeAvailable(sub);
  if (available < estimatedMinutes) {
    return {
      error: `Saldo insuficiente (${available} min disponíveis, estimativa ${estimatedMinutes} min). Compre minutos adicionais ou contacte-nos.`,
    };
  }

  const trip = await prisma.trip.create({
    data: {
      customerId: session.user.id,
      subscriptionId: sub.id,
      status: "AWAITING_CONFIRMATION",
      tripType: formData.get("tripType") === "ROUND_TRIP" ? "ROUND_TRIP" : "ONE_WAY",
      pickupAddress,
      pickupLat: Number(formData.get("pickupLat") || 0) || null,
      pickupLng: Number(formData.get("pickupLng") || 0) || null,
      dropoffAddress,
      dropoffLat: Number(formData.get("dropoffLat") || 0) || null,
      dropoffLng: Number(formData.get("dropoffLng") || 0) || null,
      scheduledAt,
      passengers: Number(formData.get("passengers") || 1),
      luggage: Number(formData.get("luggage") || 0),
      needsWaiting,
      estimatedWaitMinutes,
      notes: String(formData.get("notes") || "") || null,
      passengerContact: String(formData.get("passengerContact") || "") || null,
      distanceMeters: distanceMeters ?? null,
      durationSeconds: durationSeconds ?? null,
      estimatedMinutes,
      isImmediate: mode === "request",
    },
  });

  await notify({
    userId: session.user.id,
    email: user.email,
    type: "TRIP_REQUESTED",
    title: "Pedido de viagem recebido",
    body: "O seu pedido ficou «A aguardar confirmação». Só está confirmado após resposta da FC Private Driver.",
  });

  // Notify admins
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
  for (const admin of admins) {
    await notify({
      userId: admin.id,
      email: admin.email,
      type: "TRIP_REQUESTED_ADMIN",
      title: "Novo pedido de viagem",
      body: `${user.name}: ${pickupAddress} → ${dropoffAddress}`,
    });
  }

  revalidatePath("/pt/cliente");
  return {
    success:
      mode === "request"
        ? "Pedido enviado. Estado: A aguardar confirmação."
        : "Viagem agendada. Estado: A aguardar confirmação.",
    tripId: trip.id,
  };
}

export async function driverTripAction(
  tripId: string,
  action:
    | "accept"
    | "decline"
    | "en_route"
    | "arrived"
    | "start"
    | "start_wait"
    | "end_wait"
    | "complete",
  extra?: { tollsCents?: number; parkingCents?: number; notes?: string },
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão inválida." };

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      assignments: { where: { status: { in: ["PENDING", "ACCEPTED"] } }, orderBy: { createdAt: "desc" } },
      timer: true,
      customer: true,
      subscription: true,
    },
  });
  if (!trip) return { error: "Viagem não encontrada." };

  const assignment = trip.assignments.find((a) => a.driverUserId === session.user.id);
  if (!assignment && session.user.role !== "ADMIN") {
    return { error: "Sem permissão nesta viagem." };
  }

  const settings = await getSiteSettings();
  const now = new Date();

  if (action === "accept" && assignment) {
    await prisma.tripAssignment.update({
      where: { id: assignment.id },
      data: { status: "ACCEPTED", respondedAt: now },
    });
    await prisma.trip.update({
      where: { id: tripId },
      data: { status: "DRIVER_ASSIGNED" },
    });
  } else if (action === "decline" && assignment) {
    await prisma.tripAssignment.update({
      where: { id: assignment.id },
      data: { status: "DECLINED", respondedAt: now },
    });
  } else if (action === "en_route") {
    await prisma.trip.update({ where: { id: tripId }, data: { status: "DRIVER_EN_ROUTE" } });
  } else if (action === "arrived") {
    await prisma.trip.update({ where: { id: tripId }, data: { status: "DRIVER_ARRIVED" } });
    await prisma.tripTimer.upsert({
      where: { tripId },
      create: { tripId, scheduledAt: trip.scheduledAt, driverArrivedAt: now },
      update: { driverArrivedAt: now },
    });
  } else if (action === "start") {
    await prisma.trip.update({ where: { id: tripId }, data: { status: "IN_PROGRESS" } });
    await prisma.tripTimer.upsert({
      where: { tripId },
      create: { tripId, scheduledAt: trip.scheduledAt, startedAt: now },
      update: { startedAt: now },
    });
  } else if (action === "start_wait") {
    await prisma.tripTimer.upsert({
      where: { tripId },
      create: { tripId, waitingStartedAt: now },
      update: { waitingStartedAt: now },
    });
  } else if (action === "end_wait") {
    const timer = await prisma.tripTimer.findUnique({ where: { tripId } });
    let add = 0;
    if (timer?.waitingStartedAt) {
      add = Math.ceil((now.getTime() - timer.waitingStartedAt.getTime()) / 60000);
    }
    await prisma.tripTimer.update({
      where: { tripId },
      data: {
        waitingEndedAt: now,
        waitingMinutes: (timer?.waitingMinutes || 0) + add,
        waitingStartedAt: null,
      },
    });
  } else if (action === "complete") {
    const timer = await prisma.tripTimer.findUnique({ where: { tripId } });
    const startedAt = timer?.startedAt || now;
    const tripMinutes = Math.ceil((now.getTime() - startedAt.getTime()) / 60000);
    let waitingMinutes = timer?.waitingMinutes || 0;

    // If waiting still open, close it
    if (timer?.waitingStartedAt) {
      waitingMinutes += Math.ceil((now.getTime() - timer.waitingStartedAt.getTime()) / 60000);
    }

    // Late start after tolerance: optional waiting charge if previously flagged
    if (timer?.toleranceUsed && timer.driverArrivedAt && timer.startedAt) {
      const late = Math.ceil((timer.startedAt.getTime() - timer.driverArrivedAt.getTime()) / 60000);
      const billableWait = Math.max(0, late - settings.toleranceMinutes);
      waitingMinutes += billableWait;
    }

    const total = applyMinimumCharge(tripMinutes + waitingMinutes, settings.minimumChargeMinutes);

    await prisma.tripTimer.upsert({
      where: { tripId },
      create: {
        tripId,
        endedAt: now,
        tripMinutes,
        waitingMinutes,
        totalMinutes: total,
      },
      update: {
        endedAt: now,
        tripMinutes,
        waitingMinutes,
        totalMinutes: total,
        waitingStartedAt: null,
      },
    });

    if (extra?.tollsCents) {
      await prisma.extraCharge.create({
        data: {
          tripId,
          label: "Portagens",
          amountCents: extra.tollsCents,
          kind: "toll",
          createdById: session.user.id,
        },
      });
    }
    if (extra?.parkingCents) {
      await prisma.extraCharge.create({
        data: {
          tripId,
          label: "Estacionamento",
          amountCents: extra.parkingCents,
          kind: "parking",
          createdById: session.user.id,
        },
      });
    }
    if (extra?.notes) {
      await prisma.trip.update({
        where: { id: tripId },
        data: { adminNotes: extra.notes },
      });
    }

    if (trip.subscriptionId) {
      const settled = await settleTripMinutes({
        userId: trip.customerId,
        subscriptionId: trip.subscriptionId,
        tripId,
        chargedMinutes: total,
        reservedMinutes: trip.reservedMinutes,
        actorId: session.user.id,
      });

      await notify({
        userId: trip.customerId,
        email: trip.customer.email,
        type: "TRIP_COMPLETED",
        title: "Viagem concluída",
        body: `Viagem concluída. Foram utilizados ${total} minutos. Tem agora ${settled.available} minutos disponíveis.`,
      });
    } else {
      await prisma.trip.update({
        where: { id: tripId },
        data: { status: "COMPLETED", completedAt: now, chargedMinutes: total },
      });
    }
  }

  revalidatePath("/pt/motorista");
  revalidatePath("/pt/cliente");
  revalidatePath("/pt/admin");
  return { success: "Atualizado." };
}

export async function confirmTripAdminAction(
  tripId: string,
  driverProfileId?: string,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return { error: "Sem permissão." };

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return { error: "Viagem não encontrada." };

  let driverId = driverProfileId;
  if (!driverId) {
    const primary = await prisma.driverProfile.findFirst({ where: { active: true } });
    driverId = primary?.id;
  }
  if (!driverId) return { error: "Sem motorista disponível." };

  const driver = await prisma.driverProfile.findUnique({
    where: { id: driverId },
    include: { user: true },
  });
  if (!driver) return { error: "Motorista inválido." };

  await prisma.$transaction(async (tx) => {
    await tx.trip.update({
      where: { id: tripId },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        reservedMinutes: trip.estimatedMinutes || 0,
      },
    });
    await tx.tripAssignment.create({
      data: {
        tripId,
        driverId: driver.id,
        driverUserId: driver.userId,
        status: "ACCEPTED",
        assignedById: session.user.id,
        respondedAt: new Date(),
      },
    });
  });

  if (trip.subscriptionId && trip.estimatedMinutes) {
    await reserveTripMinutes({
      userId: trip.customerId,
      subscriptionId: trip.subscriptionId,
      tripId,
      minutes: trip.estimatedMinutes,
      actorId: session.user.id,
    });
  }

  const customer = await prisma.user.findUnique({ where: { id: trip.customerId } });
  if (customer) {
    await notify({
      userId: customer.id,
      email: customer.email,
      type: "TRIP_CONFIRMED",
      title: "Viagem confirmada",
      body: `A sua viagem foi confirmada. Motorista: ${driver.user.name}.`,
    });
  }
  await notify({
    userId: driver.userId,
    email: driver.user.email,
    type: "TRIP_ASSIGNED",
    title: "Viagem atribuída",
    body: `${trip.pickupAddress} → ${trip.dropoffAddress}`,
  });

  await prisma.adminAuditLog.create({
    data: {
      actorId: session.user.id,
      action: "TRIP_CONFIRM",
      entityType: "Trip",
      entityId: tripId,
      meta: JSON.stringify({ driverId }),
    },
  });

  revalidatePath("/pt/admin");
  return { success: "Viagem confirmada e motorista atribuído." };
}

export async function adminAdjustMinutesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return { error: "Sem permissão." };

  const userId = String(formData.get("userId") || "");
  const minutes = Number(formData.get("minutes") || 0);
  const reason = String(formData.get("reason") || "");
  if (!userId || !minutes || !reason) {
    return { error: "Indique cliente, minutos e motivo obrigatório." };
  }

  const sub = await getActiveSubscription(userId);
  if (!sub) return { error: "Cliente sem subscrição ativa." };

  await applyMinuteTransaction({
    userId,
    subscriptionId: sub.id,
    type: minutes > 0 ? "PROMOTIONAL" : "ADMIN_ADJUSTMENT",
    minutes,
    reason,
    actorId: session.user.id,
    counter: "included",
  });

  await prisma.adminAuditLog.create({
    data: {
      actorId: session.user.id,
      action: "MINUTES_ADJUST",
      entityType: "User",
      entityId: userId,
      reason,
      meta: JSON.stringify({ minutes }),
    },
  });

  revalidatePath("/pt/admin");
  return { success: "Minutos atualizados com registo no histórico." };
}
