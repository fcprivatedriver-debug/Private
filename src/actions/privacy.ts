"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireFamilyContext } from "@/lib/session";
import { isDemoEmail } from "@/lib/demo-mode";

function revalidateAll() {
  revalidatePath("/", "layout");
}

/** Exportação completa RGPD (JSON). */
export async function exportAllPersonalData() {
  const { session, family, membership } = await requireFamilyContext();

  const [user, incomes, expenses, goals, pots, shopping, memory, alerts, connections] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          theme: true,
          locale: true,
          ninaReplyStyle: true,
          ninaHumor: true,
          createdAt: true,
        },
      }),
      prisma.income.findMany({ where: { familyId: family.id } }),
      prisma.expense.findMany({ where: { familyId: family.id } }),
      prisma.savingsGoal.findMany({ where: { familyId: family.id } }),
      prisma.savingPot.findMany({ where: { familyId: family.id } }),
      prisma.shoppingList.findMany({
        where: { familyId: family.id },
        include: { items: true },
      }),
      prisma.ninaMemoryRule.findMany({ where: { familyId: family.id } }),
      prisma.alert.findMany({ where: { familyId: family.id } }),
      prisma.ninaConnection.findMany({ where: { familyId: family.id } }),
    ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    membership: { role: membership.role, displayName: membership.displayName },
    user,
    family: { id: family.id, name: family.name, kind: family.kind },
    incomes,
    expenses,
    goals,
    pots,
    shopping,
    memory,
    alerts,
    connections,
  };

  return {
    ok: true as const,
    filename: `nina-dados-${new Date().toISOString().slice(0, 10)}.json`,
    json: JSON.stringify(payload, null, 2),
  };
}

export async function deleteReceiptMedia() {
  const { family } = await requireFamilyContext();
  const res = await prisma.expense.updateMany({
    where: { familyId: family.id },
    data: { receiptImageUrl: null, receiptPdfUrl: null },
  });
  revalidateAll();
  return { ok: true as const, count: res.count };
}

export async function deleteTransactionHistory() {
  const { family, session } = await requireFamilyContext();
  if (isDemoEmail(session.user.email)) {
    return { ok: false as const, error: "A conta demo não pode apagar o histórico." };
  }
  await prisma.$transaction([
    prisma.expense.deleteMany({ where: { familyId: family.id } }),
    prisma.income.deleteMany({ where: { familyId: family.id } }),
    prisma.alert.deleteMany({ where: { familyId: family.id } }),
    prisma.aiInsight.deleteMany({ where: { familyId: family.id } }),
  ]);
  revalidateAll();
  return { ok: true as const };
}

export async function deleteOwnAccount() {
  const { session, membership, family } = await requireFamilyContext();
  if (isDemoEmail(session.user.email)) {
    return { ok: false as const, error: "A conta demo não pode ser eliminada." };
  }

  const userId = session.user.id;
  const ownerCount = await prisma.familyMember.count({
    where: { familyId: family.id, role: "OWNER" },
  });

  if (membership.role === "OWNER" && ownerCount <= 1) {
    // Apaga a família inteira (cascade)
    await prisma.family.delete({ where: { id: family.id } });
  } else {
    await prisma.familyMember.delete({ where: { id: membership.id } });
  }

  await prisma.session.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  revalidateAll();
  return { ok: true as const };
}

export async function revokeAllConnections() {
  const { family } = await requireFamilyContext();
  await prisma.ninaConnection.updateMany({
    where: { familyId: family.id },
    data: { status: "PAUSED", revokedAt: new Date(), autoImport: false },
  });
  revalidateAll();
  return { ok: true as const };
}
