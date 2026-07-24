"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { requireFamilyContext, requireSession } from "@/lib/session";
import { canManageMembers, makeInviteCode } from "@/domain/household";
import type { FinanceScope, HouseholdKind } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_PASSWORD } from "@/lib/demo-mode";

function revalidateAll() {
  revalidatePath("/", "layout");
}

export type NinaSpace = "personal" | "family";

export async function setNinaSpace(space: NinaSpace) {
  const jar = await cookies();
  jar.set("nina_space", space, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidateAll();
  return { ok: true as const, space };
}

export async function getNinaSpace(): Promise<NinaSpace> {
  const jar = await cookies();
  const v = jar.get("nina_space")?.value;
  return v === "family" ? "family" : "personal";
}

/** Um único botão: transforma a conta em Familiar e gera convite seguro. */
export async function createFamilyAccountSimple(formData?: FormData) {
  const { session, membership, family } = await requireFamilyContext();
  const name =
    String(formData?.get("name") || "").trim() ||
    family.name.replace(/^Família\s+/i, "") ||
    `Família ${membership.displayName}`;

  const kind: HouseholdKind = "FAMILY";
  const inviteCode = family.inviteCode || makeInviteCode();

  await prisma.family.update({
    where: { id: family.id },
    data: {
      name: name.startsWith("Família") ? name : `Família ${name}`,
      kind,
      inviteCode,
    },
  });

  // Garantir que o criador é OWNER/ADMIN
  if (membership.role === "MEMBER" || membership.role === "VIEWER") {
    await prisma.familyMember.update({
      where: { id: membership.id },
      data: { role: "OWNER" },
    });
  }

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const invite = await prisma.familyInvite.create({
    data: {
      familyId: family.id,
      token,
      createdById: session.user.id,
      label: "Convite familiar",
      expiresAt,
    },
  });

  await setNinaSpace("family");
  revalidateAll();

  return {
    ok: true as const,
    inviteToken: invite.token,
    invitePath: `/pt/convite/${invite.token}`,
    inviteCode,
  };
}

export async function createSecureInvite() {
  const { session, membership, family } = await requireFamilyContext();
  if (!canManageMembers(membership.role) && family.kind === "INDIVIDUAL") {
    // permitir gerar convite ao criar família
  } else if (!canManageMembers(membership.role)) {
    return { ok: false as const, error: "Só administradores podem convidar." };
  }

  if (family.kind === "INDIVIDUAL") {
    await prisma.family.update({
      where: { id: family.id },
      data: { kind: "FAMILY", inviteCode: family.inviteCode || makeInviteCode() },
    });
  }

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  const invite = await prisma.familyInvite.create({
    data: {
      familyId: family.id,
      token,
      createdById: session.user.id,
      expiresAt,
    },
  });

  revalidateAll();
  return {
    ok: true as const,
    inviteToken: invite.token,
    invitePath: `/pt/convite/${invite.token}`,
  };
}

export async function acceptFamilyInvite(token: string) {
  const session = await requireSession();
  const invite = await prisma.familyInvite.findUnique({
    where: { token },
    include: { family: true },
  });
  if (!invite || invite.acceptedAt) {
    return { ok: false as const, error: "Este convite já não é válido." };
  }
  if (invite.expiresAt < new Date()) {
    return { ok: false as const, error: "Este convite expirou. Pede um novo." };
  }

  const existing = await prisma.familyMember.findUnique({
    where: {
      familyId_userId: { familyId: invite.familyId, userId: session.user.id },
    },
  });

  if (!existing) {
    // Remover membership solo anterior para focar na conta familiar
    const old = await prisma.familyMember.findFirst({
      where: { userId: session.user.id },
      include: { family: true },
    });
    if (old && old.familyId !== invite.familyId && old.family.kind === "INDIVIDUAL") {
      // se era conta individual só com este user, pode manter — mas preferimos a familiar
      await prisma.familyMember.delete({ where: { id: old.id } }).catch(() => undefined);
    }

    await prisma.familyMember.create({
      data: {
        familyId: invite.familyId,
        userId: session.user.id,
        displayName: (session.user.name || "Membro").split(" ")[0],
        role: "MEMBER",
      },
    });
  }

  await prisma.familyInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date(), acceptedById: session.user.id },
  });

  await prisma.alert.create({
    data: {
      familyId: invite.familyId,
      userId: session.user.id,
      type: "CUSTOM",
      title: "Bem-vindo à Conta Familiar",
      message: `Já estás ligado a “${invite.family.name}”. A Nina sincroniza tudo por vocês.`,
      level: "success",
    },
  });

  await setNinaSpace("family");
  revalidateAll();
  return { ok: true as const, familyName: invite.family.name };
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
  if (!canManageMembers(membership.role)) return { ok: false as const, error: "Sem permissão" };
  if (family.inviteCode) return { ok: true as const, code: family.inviteCode };
  const code = makeInviteCode();
  await prisma.family.update({ where: { id: family.id }, data: { inviteCode: code } });
  revalidateAll();
  return { ok: true as const, code };
}

export async function joinHouseholdByCode(formData: FormData) {
  const code = String(formData.get("code") || "").trim().toUpperCase();
  if (!code) return { ok: false as const, error: "Indica o código." };
  // Prefer token invites; keep code as fallback via inviteCode on family
  const family = await prisma.family.findUnique({ where: { inviteCode: code } });
  if (!family) return { ok: false as const, error: "Código inválido." };

  // Create a fresh secure invite and accept it for current user
  const { session } = await requireFamilyContext();
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);
  await prisma.familyInvite.create({
    data: {
      familyId: family.id,
      token,
      createdById: session.user.id,
      expiresAt,
    },
  });
  return acceptFamilyInvite(token);
}

export async function updateMemberRole(
  memberId: string,
  role: "ADMIN" | "MEMBER" | "VIEWER" | "OWNER",
) {
  const { membership, family } = await requireFamilyContext();
  if (!canManageMembers(membership.role)) return { ok: false as const, error: "Sem permissão" };
  const target = await prisma.familyMember.findFirst({
    where: { id: memberId, familyId: family.id },
  });
  if (!target || target.role === "OWNER") {
    return { ok: false as const, error: "Não é possível alterar este membro." };
  }
  await prisma.familyMember.update({ where: { id: memberId }, data: { role } });
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
  const roleRaw = String(formData.get("role") || "MEMBER");
  const role = roleRaw === "ADMIN" || roleRaw === "VIEWER" ? roleRaw : "MEMBER";
  const password = String(formData.get("password") || DEMO_PASSWORD);
  if (!name || !email) return { ok: false as const, error: "Nome e email necessários." };

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { name, email, passwordHash: await bcrypt.hash(password, 10) },
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
  revalidateAll();
  return { ok: true as const };
}

import { applySavingsTransfer } from "@/lib/savings-transfer";

export async function contributeSharedGoals(familyId: string, amountCents: number, hint?: string) {
  if (amountCents <= 0) return;
  await applySavingsTransfer(familyId, amountCents, hint);
}

export async function maybeAutoSaveFromSurplus(familyId: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const [incomes, expenses, budgets, goals] = await Promise.all([
    prisma.income.aggregate({
      where: { familyId, scope: "FAMILY", date: { gte: start, lte: end } },
      _sum: { amountCents: true },
    }),
    prisma.expense.aggregate({
      where: { familyId, scope: "FAMILY", date: { gte: start, lte: end } },
      _sum: { amountCents: true },
    }),
    prisma.budget.findMany({ where: { familyId, year, month } }),
    prisma.savingsGoal.findMany({ where: { familyId, scope: "FAMILY", isCompleted: false } }),
  ]);
  if (!goals.length) return null;
  const incomeCents = incomes._sum.amountCents ?? 0;
  const expenseCents = expenses._sum.amountCents ?? 0;
  const budgetLimit = budgets.reduce((s, b) => s + b.limitCents, 0);
  const balance = incomeCents - expenseCents;
  if (balance <= 0) return null;
  const underBudget = budgetLimit > 0 && expenseCents < budgetLimit;
  if (!underBudget && balance < 5000) return null;
  return { suggestedSaveCents: Math.round(balance * 0.05), underBudget };
}

export async function addMemoryRule(input: {
  triggerPhrase: string;
  scope: FinanceScope;
  categorySlug?: string;
}) {
  const { session, family } = await requireFamilyContext();
  await prisma.ninaMemoryRule.create({
    data: {
      userId: session.user.id,
      familyId: family.id,
      triggerPhrase: input.triggerPhrase,
      scope: input.scope,
      categorySlug: input.categorySlug,
    },
  });
  revalidateAll();
  return { ok: true as const };
}

export async function deleteMemoryRule(id: string) {
  const { session } = await requireFamilyContext();
  await prisma.ninaMemoryRule.deleteMany({ where: { id, userId: session.user.id } });
  revalidateAll();
  return { ok: true as const };
}

export async function updateProfile(formData: FormData) {
  const session = await requireSession();
  const name = String(formData.get("name") || "").trim();
  const theme = String(formData.get("theme") || "system");
  const biometricsEnabled = formData.get("biometrics") === "on";
  const pin = String(formData.get("pin") || "").trim();

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: name || undefined,
      theme: ["light", "dark", "system"].includes(theme) ? theme : "system",
      biometricsEnabled,
      pinHash: pin.length >= 4 ? await bcrypt.hash(pin, 10) : undefined,
    },
  });

  const membership = await prisma.familyMember.findFirst({
    where: { userId: session.user.id },
  });
  if (membership && name) {
    await prisma.familyMember.update({
      where: { id: membership.id },
      data: { displayName: name.split(" ")[0] },
    });
  }
  revalidateAll();
  return { ok: true as const };
}
