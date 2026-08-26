"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/actions/auth";
import { notify } from "@/lib/notifications";

export async function refuseTripAdminAction(tripId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return { error: "Sem permissão." };

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { customer: true },
  });
  if (!trip) return { error: "Viagem não encontrada." };
  if (trip.status !== "AWAITING_CONFIRMATION") {
    return { error: "Só é possível recusar viagens a aguardar confirmação." };
  }

  await prisma.trip.update({
    where: { id: tripId },
    data: { status: "CANCELLED", cancelledReason: "Recusada pela administração" },
  });

  await notify({
    userId: trip.customerId,
    email: trip.customer.email,
    type: "TRIP_REFUSED",
    title: "Pedido de viagem recusado",
    body: "Não foi possível confirmar o seu pedido. Contacte-nos para alternativas.",
  });

  await prisma.adminAuditLog.create({
    data: {
      actorId: session.user.id,
      action: "TRIP_REFUSE",
      entityType: "Trip",
      entityId: tripId,
    },
  });

  revalidatePath("/pt/admin");
  return { success: "Viagem recusada." };
}
