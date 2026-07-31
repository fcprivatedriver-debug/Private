import { MinuteTxnType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type Tx = Prisma.TransactionClient;

export async function getActiveSubscription(userId: string) {
  return prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
}

export function computeAvailable(sub: {
  minutesIncluded: number;
  minutesUsed: number;
  minutesReserved: number;
}) {
  return Math.max(0, sub.minutesIncluded - sub.minutesUsed - sub.minutesReserved);
}

/**
 * Ledger rules:
 * - Negative minutes = debit (reduce available)
 * - Positive minutes = credit (increase available)
 * Counters:
 * - used: debit increases minutesUsed; credit decreases minutesUsed
 * - reserved: debit increases minutesReserved; credit decreases minutesReserved
 * - included: credit/debit adjusts minutesIncluded directly
 */
export async function applyMinuteTransaction(
  input: {
    userId: string;
    subscriptionId: string;
    tripId?: string;
    type: MinuteTxnType;
    minutes: number;
    reason: string;
    actorId?: string;
    meta?: Record<string, unknown>;
    counter?: "used" | "reserved" | "included" | "none";
  },
  client: Tx | typeof prisma = prisma,
) {
  const sub = await client.subscription.findUniqueOrThrow({
    where: { id: input.subscriptionId },
  });

  let { minutesUsed, minutesReserved, minutesIncluded } = sub;
  const counter = input.counter ?? inferCounter(input.type);

  if (counter === "used") {
    minutesUsed = Math.max(0, minutesUsed - input.minutes);
  } else if (counter === "reserved") {
    minutesReserved = Math.max(0, minutesReserved - input.minutes);
  } else if (counter === "included") {
    minutesIncluded = Math.max(0, minutesIncluded + input.minutes);
  }

  const available = Math.max(0, minutesIncluded - minutesUsed - minutesReserved);

  const txn = await client.minuteTransaction.create({
    data: {
      userId: input.userId,
      subscriptionId: input.subscriptionId,
      tripId: input.tripId,
      type: input.type,
      minutes: input.minutes,
      balanceAfter: available,
      reason: input.reason,
      actorId: input.actorId,
      meta: input.meta ? JSON.stringify(input.meta) : null,
    },
  });

  await client.subscription.update({
    where: { id: input.subscriptionId },
    data: { minutesUsed, minutesReserved, minutesIncluded },
  });

  return { txn, available, minutesUsed, minutesReserved, minutesIncluded };
}

function inferCounter(type: MinuteTxnType): "used" | "reserved" | "included" | "none" {
  switch (type) {
    case "TRIP_COMPLETED":
    case "WAITING":
      return "used";
    case "RESERVATION":
    case "RESERVATION_RELEASE":
      return "reserved";
    case "PLAN_RENEWAL":
    case "EXTRA_PURCHASE":
    case "PROMOTIONAL":
    case "ADMIN_ADJUSTMENT":
      return "included";
    default:
      return "none";
  }
}

export async function settleTripMinutes(params: {
  userId: string;
  subscriptionId: string;
  tripId: string;
  chargedMinutes: number;
  reservedMinutes: number;
  actorId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    if (params.reservedMinutes > 0) {
      await applyMinuteTransaction(
        {
          userId: params.userId,
          subscriptionId: params.subscriptionId,
          tripId: params.tripId,
          type: "RESERVATION_RELEASE",
          minutes: params.reservedMinutes,
          reason: "Libertação de minutos reservados",
          actorId: params.actorId,
          counter: "reserved",
        },
        tx,
      );
    }

    const result = await applyMinuteTransaction(
      {
        userId: params.userId,
        subscriptionId: params.subscriptionId,
        tripId: params.tripId,
        type: "TRIP_COMPLETED",
        minutes: -params.chargedMinutes,
        reason: `Viagem concluída — ${params.chargedMinutes} minutos`,
        actorId: params.actorId,
        counter: "used",
      },
      tx,
    );

    await tx.trip.update({
      where: { id: params.tripId },
      data: {
        chargedMinutes: params.chargedMinutes,
        reservedMinutes: 0,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    return result;
  });
}

export async function reserveTripMinutes(params: {
  userId: string;
  subscriptionId: string;
  tripId: string;
  minutes: number;
  actorId?: string;
}) {
  return applyMinuteTransaction({
    userId: params.userId,
    subscriptionId: params.subscriptionId,
    tripId: params.tripId,
    type: "RESERVATION",
    minutes: -params.minutes,
    reason: `Reserva de ${params.minutes} minutos para viagem`,
    actorId: params.actorId,
    counter: "reserved",
  });
}

export function applyMinimumCharge(rawMinutes: number, minimum: number) {
  return Math.max(rawMinutes, minimum);
}
