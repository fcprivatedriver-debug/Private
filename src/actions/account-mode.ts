"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveActiveMode, type AccountMode } from "@/lib/account-mode";
import { toActionFailure } from "@/lib/action-errors";

export async function switchAccountModeAction(mode: AccountMode) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false as const, error: "Inicie sessão para continuar.", code: "UNAUTHORIZED" };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        customerProfile: { select: { id: true } },
        driverProfile: { select: { id: true } },
      },
    });
    if (!user) {
      return { ok: false as const, error: "Conta não encontrada.", code: "NOT_FOUND" };
    }

    const hasCustomer =
      Boolean(user.customerProfile) || user.role === "CUSTOMER" || user.role === "ADMIN";
    const hasDriver = Boolean(user.driverProfile) || user.role === "DRIVER";

    if (mode === "CUSTOMER" && !hasCustomer) {
      return {
        ok: false as const,
        error: "Esta conta ainda não tem perfil de cliente.",
        code: "NO_CUSTOMER",
      };
    }
    if (mode === "DRIVER" && !hasDriver) {
      return {
        ok: false as const,
        error: "Ative o modo motorista para continuar.",
        code: "NO_DRIVER",
      };
    }

    const activeMode = resolveActiveMode({
      role: user.role,
      hasCustomer,
      hasDriver,
      preferred: mode,
    });

    return {
      ok: true as const,
      activeMode,
      hasCustomer,
      hasDriver,
      role: user.role,
    };
  } catch (error) {
    return toActionFailure(error);
  }
}

/** Existing customer enables driver onboarding on the same account. */
export async function enableDriverModeAction() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false as const, error: "Inicie sessão para continuar.", code: "UNAUTHORIZED" };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        customerProfile: true,
        driverProfile: true,
      },
    });
    if (!user) {
      return { ok: false as const, error: "Conta não encontrada.", code: "NOT_FOUND" };
    }

    if (!user.customerProfile && user.role !== "ADMIN") {
      await prisma.customerProfile.create({ data: { userId: user.id } });
    }

    if (!user.driverProfile) {
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

    // Keep role as DRIVER if they want to drive; CUSTOMER can stay if they started as customer
    // but capabilities come from profiles. Prefer leaving role if ADMIN.
    if (user.role === "CUSTOMER") {
      // role stays CUSTOMER; hasDriver profile unlocks driver mode
    }

    return {
      ok: true as const,
      activeMode: "DRIVER" as const,
      hasCustomer: true,
      hasDriver: true,
    };
  } catch (error) {
    return toActionFailure(error);
  }
}

/** Ensure driver also has customer profile to request trips. */
export async function ensureCustomerProfileAction() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false as const, error: "Inicie sessão para continuar.", code: "UNAUTHORIZED" };
    }
    const existing = await prisma.customerProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!existing) {
      await prisma.customerProfile.create({ data: { userId: session.user.id } });
    }
    return { ok: true as const, hasCustomer: true };
  } catch (error) {
    return toActionFailure(error);
  }
}
