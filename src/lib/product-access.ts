import { prisma } from "@/lib/db";

/**
 * Acesso ao produto (TESTER / futuro SUBSCRIPTION).
 * Separado de FamilyRole (OWNER/ADMIN/MEMBER/VIEWER).
 *
 * O utilizador NÃO pode auto-atribuir TESTER — só via grantAdminProductAccess
 * (protegido por PRODUCT_ACCESS_ADMIN_KEY no servidor).
 */

export type ProductAccessSnapshot = {
  isTester: boolean;
  hasProductAccess: boolean;
  status: string | null;
  endsAt: Date | null;
  reason?: string;
};

export async function getProductAccessForUser(userId: string): Promise<ProductAccessSnapshot> {
  const now = new Date();
  const rows = await prisma.productAccess.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const activeTester = rows.find((r) => {
    if (r.kind !== "TESTER") return false;
    if (r.status !== "ACTIVE") return false;
    if (r.startsAt && r.startsAt > now) return false;
    if (r.endsAt && r.endsAt < now) return false;
    return true;
  });

  if (activeTester) {
    return {
      isTester: true,
      hasProductAccess: true,
      status: activeTester.status,
      endsAt: activeTester.endsAt,
    };
  }

  const expired = rows.find((r) => r.kind === "TESTER" && r.endsAt && r.endsAt < now);
  if (expired) {
    if (expired.status === "ACTIVE") {
      await prisma.productAccess.update({
        where: { id: expired.id },
        data: { status: "EXPIRED" },
      });
    }
    return {
      isTester: false,
      hasProductAccess: true, // core app ainda aberto — paywall Stripe futuro
      status: "EXPIRED",
      endsAt: expired.endsAt,
      reason: "Período de teste terminado.",
    };
  }

  // Sem Stripe ainda: qualquer utilizador autenticado com família tem acesso ao core.
  return {
    isTester: false,
    hasProductAccess: true,
    status: null,
    endsAt: null,
  };
}

/** Atribuição administrativa — requer chave de ambiente, nunca self-service. */
export async function grantAdminProductAccess(opts: {
  adminKey: string;
  userId: string;
  kind?: "TESTER";
  startsAt?: Date | null;
  endsAt?: Date | null;
  notes?: string;
  grantedBy?: string;
}) {
  const expected = process.env.PRODUCT_ACCESS_ADMIN_KEY?.trim();
  if (!expected || opts.adminKey !== expected) {
    return { ok: false as const, error: "Não autorizado" };
  }

  const row = await prisma.productAccess.create({
    data: {
      userId: opts.userId,
      kind: opts.kind ?? "TESTER",
      status: "ACTIVE",
      startsAt: opts.startsAt ?? new Date(),
      endsAt: opts.endsAt ?? null,
      notes: opts.notes ?? null,
      grantedBy: opts.grantedBy ?? "admin",
    },
  });

  return { ok: true as const, id: row.id };
}

export async function revokeAdminProductAccess(opts: {
  adminKey: string;
  accessId: string;
}) {
  const expected = process.env.PRODUCT_ACCESS_ADMIN_KEY?.trim();
  if (!expected || opts.adminKey !== expected) {
    return { ok: false as const, error: "Não autorizado" };
  }
  await prisma.productAccess.update({
    where: { id: opts.accessId },
    data: { status: "REVOKED" },
  });
  return { ok: true as const };
}
