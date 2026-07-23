"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireFamilyContext } from "@/lib/session";
import {
  canManageMembers,
  makeInviteCode,
  HOUSEHOLD_KIND_LABELS,
} from "@/domain/household";
import type { FamilyRole, HouseholdKind } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_PASSWORD } from "@/lib/demo-mode";

function revalidateAll() {
  revalidatePath("/", "layout");
}

export async function updateHouseholdSettings(formData: FormData) {
  const { membership, family } = await requireFamilyContext();
  if (!canManageMembers(membership.role)) {
    return { ok: false as const, error: "Só administradores podem alterar a conta." };
  }

  const name = String(formData.get("name") || "").trim();
  const kind = String(formData.get("kind") || family.kind) as HouseholdKind;

  await prisma.family.update({
    where: { id: family.id },
    data: {
      name: name || family.name,
      kind: ["INDIVIDUAL", "COUPLE", "FAMILY", "SHARED"].includes(kind) ? kind : family.kind,
    },
  });
  revalidateAll();
  return { ok: true as const };
}

export async function ensureInviteCode() {
  const { membership, family } = await requireFamilyContext();
  if (!canManageMembers(membership.role)) {
    return { ok: false as const, error: "Sem permissão" };
  }
  if (family.inviteCode) return { ok: true as const, code: family.inviteCode };

  let code = makeInviteCode();
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.family.findUnique({ where: { inviteCode: code } });
    if (!exists) break;
    code = makeInviteCode();
  }
  await prisma.family.update({ where: { id: family.id }, data: { inviteCode: code } });
  revalidateAll();
  return { ok: true as const, code };
}

export async function joinHouseholdByCode(formData: FormData) {
  const { session, membership } = await requireFamilyContext();
  const code = String(formData.get("code") || "")
    .trim()
    .toUpperCase()
    .replace(/\s/g, "");
  if (!code) return { ok: false as const, error: "Indica o código do convite." };

  const target = await prisma.family.findUnique({ where: { inviteCode: code } });
  if (!target) return { ok: false as const, error: "Código inválido." };
  if (target.id === membership.familyId) {
    return { ok: false as const, error: "Já estás nesta conta." };
  }

  await prisma.familyMember.upsert({
    where: {
      familyId_userId: { familyId: target.id, userId: session.user.id },
    },
    create: {
      familyId: target.id,
      userId: session.user.id,
      displayName: (session.user.name || "Membro").split(" ")[0],
      role: "MEMBER",
    },
    update: {},
  });

  // Prefer the joined household as "active" by deleting other memberships? 
  // Better: keep multiple memberships; getActiveFamilyForUser uses oldest.
  // Move: delete old membership so joined becomes active, OR update session preference.
  // For simplicity: remove previous membership so the invite account becomes active.
  if (membership.familyId !== target.id) {
    await prisma.familyMember.delete({ where: { id: membership.id } }).catch(() => undefined);
  }

  revalidateAll();
  return {
    ok: true as const,
    message: `Entraste na ${HOUSEHOLD_KIND_LABELS[target.kind]} “${target.name}”. Bem-vindo!`,
  };
}

export async function updateMemberRole(memberId: string, role: FamilyRole) {
  const { membership, family } = await requireFamilyContext();
  if (!canManageMembers(membership.role)) {
    return { ok: false as const, error: "Sem permissão" };
  }
  if (role === "OWNER" && membership.role !== "OWNER") {
    return { ok: false as const, error: "Só o dono pode atribuir administrador principal." };
  }

  const target = await prisma.familyMember.findFirst({
    where: { id: memberId, familyId: family.id },
  });
  if (!target) return { ok: false as const, error: "Membro não encontrado" };
  if (target.role === "OWNER") {
    return { ok: false as const, error: "O administrador principal não pode ser alterado assim." };
  }

  await prisma.familyMember.update({
    where: { id: memberId },
    data: { role },
  });
  revalidateAll();
  return { ok: true as const };
}

export async function inviteMemberToHousehold(formData: FormData) {
  const { membership, family } = await requireFamilyContext();
  if (!canManageMembers(membership.role)) {
    return { ok: false as const, error: "Sem permissão para convidar." };
  }

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const roleRaw = String(formData.get("role") || "MEMBER") as FamilyRole;
  const role: FamilyRole =
    roleRaw === "ADMIN" || roleRaw === "VIEWER" || roleRaw === "MEMBER" ? roleRaw : "MEMBER";
  const password = String(formData.get("password") || DEMO_PASSWORD);

  if (!name || !email) return { ok: false as const, error: "Nome e email são necessários." };

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await bcrypt.hash(password, 10),
      },
    });
  }

  await prisma.familyMember.upsert({
    where: { familyId_userId: { familyId: family.id, userId: user.id } },
    create: {
      familyId: family.id,
      userId: user.id,
      displayName: name.split(" ")[0],
      role,
    },
    update: { displayName: name.split(" ")[0], role },
  });

  await prisma.alert.create({
    data: {
      familyId: family.id,
      userId: user.id,
      type: "CUSTOM",
      title: "Bem-vindo à conta partilhada",
      message: `${membership.displayName} convidou-te. A Nina sincroniza tudo em tempo real para a família.`,
      level: "success",
    },
  });

  revalidateAll();
  return { ok: true as const };
}

/** Contribui automaticamente para objetivos partilhados (poupança). */
export async function contributeSharedGoals(familyId: string, amountCents: number, hint?: string) {
  if (amountCents <= 0) return;
  const goals = await prisma.savingsGoal.findMany({
    where: { familyId, isCompleted: false },
    orderBy: { createdAt: "asc" },
  });
  if (!goals.length) return;

  const target =
    (hint &&
      goals.find((g) =>
        g.name.toLowerCase().includes(hint.toLowerCase().slice(0, 5)),
      )) ||
    goals.find((g) => /ferias|viagem/i.test(g.name)) ||
    goals[0];

  if (!target) return;
  const next = Math.min(target.targetCents, target.currentCents + amountCents);
  await prisma.savingsGoal.update({
    where: { id: target.id },
    data: {
      currentCents: next,
      isCompleted: next >= target.targetCents,
    },
  });
}

/**
 * Se a família ficou abaixo do orçamento após um movimento,
 * a Nina pode encaminhar uma pequena poupança automática (5% da folga do mês).
 */
export async function maybeAutoSaveFromSurplus(familyId: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const [incomes, expenses, budgets, goals] = await Promise.all([
    prisma.income.aggregate({
      where: { familyId, date: { gte: start, lte: end } },
      _sum: { amountCents: true },
    }),
    prisma.expense.aggregate({
      where: { familyId, date: { gte: start, lte: end } },
      _sum: { amountCents: true },
    }),
    prisma.budget.findMany({ where: { familyId, year, month } }),
    prisma.savingsGoal.findMany({ where: { familyId, isCompleted: false } }),
  ]);

  if (!goals.length) return null;

  const incomeCents = incomes._sum.amountCents ?? 0;
  const expenseCents = expenses._sum.amountCents ?? 0;
  const budgetLimit = budgets.reduce((s, b) => s + b.limitCents, 0);
  const balance = incomeCents - expenseCents;
  if (balance <= 0) return null;

  const underBudget = budgetLimit > 0 && expenseCents < budgetLimit;
  if (!underBudget && balance < 5000) return null;

  // Soft auto-save signal only when clearly under plan — actual contribute is explicit via "poupei"
  return {
    suggestedSaveCents: Math.round(balance * 0.05),
    underBudget,
  };
}
