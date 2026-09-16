"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { requireFamilyContext, requireSession } from "@/lib/session";
import { canManageMembers, makeInviteCode } from "@/domain/household";
import type { FinanceScope, HouseholdKind } from "@prisma/client";
import bcrypt from "bcryptjs";

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
      channel: "LINK",
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
      channel: "LINK",
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
  if (!invite || invite.acceptedAt || invite.revokedAt) {
    return { ok: false as const, error: "Este convite já não é válido." };
  }
  if (invite.expiresAt < new Date()) {
    return { ok: false as const, error: "Este convite expirou. Pede um novo." };
  }

  // Se o convite tem email/telefone, garantir que a sessão corresponde ao destinatário
  if (invite.email) {
    const sessionEmail = (session.user.email || "").toLowerCase();
    if (sessionEmail && sessionEmail !== invite.email.toLowerCase()) {
      return {
        ok: false as const,
        error: "Este convite é para outro email. Entra com a conta correcta ou cria a tua própria conta.",
      };
    }
  }

  const existing = await prisma.familyMember.findUnique({
    where: {
      familyId_userId: { familyId: invite.familyId, userId: session.user.id },
    },
  });

  if (!existing) {
    const old = await prisma.familyMember.findFirst({
      where: { userId: session.user.id },
      include: { family: true },
    });
    if (old && old.familyId !== invite.familyId && old.family.kind === "INDIVIDUAL") {
      await prisma.familyMember.delete({ where: { id: old.id } }).catch(() => undefined);
    }

    await prisma.familyMember.create({
      data: {
        familyId: invite.familyId,
        userId: session.user.id,
        displayName: invite.inviteeName || session.user.name || "Membro",
        role: "MEMBER",
      },
    });
  }

  // Ligar telefone do convite ao user se ainda não tiver
  if (invite.phone) {
    const me = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (me && !me.phone) {
      await prisma.user
        .update({ where: { id: me.id }, data: { phone: invite.phone } })
        .catch(() => undefined);
    }
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
      message: `Já estás ligado a “${invite.family.name}”. A MEL sincroniza tudo por vocês.`,
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
  const editOthersRaw = String(formData.get("allowMembersEditOthers") || "").toLowerCase();
  const allowMembersEditOthers =
    editOthersRaw === "sim" || editOthersRaw === "yes" || editOthersRaw === "true" || editOthersRaw === "on";

  await prisma.family.update({
    where: { id: family.id },
    data: {
      name: name || family.name,
      kind: ["INDIVIDUAL", "COUPLE", "FAMILY", "SHARED"].includes(kind) ? kind : family.kind,
      allowMembersEditOthers,
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

export async function inviteMemberByEmail(formData: FormData) {
  return inviteFamilyMember(formData, "EMAIL");
}

/** Convite por telemóvel — cria o mesmo token; SMS só quando houver fornecedor. */
export async function inviteMemberByPhone(formData: FormData) {
  return inviteFamilyMember(formData, "PHONE");
}

async function inviteFamilyMember(
  formData: FormData,
  channel: "EMAIL" | "PHONE",
) {
  const { session, membership, family } = await requireFamilyContext();
  if (!canManageMembers(membership.role)) {
    return { ok: false as const, error: "Sem permissão para convidar." };
  }
  const name = String(formData.get("name") || "").trim();
  if (!name) return { ok: false as const, error: "Indica o nome do familiar." };

  let email: string | null = null;
  let phone: string | null = null;

  if (channel === "EMAIL") {
    email = String(formData.get("email") || "").trim().toLowerCase();
    if (!email) return { ok: false as const, error: "Nome e email necessários." };
  } else {
    const { normalizePhoneE164 } = await import("@/lib/phone");
    phone = normalizePhoneE164(String(formData.get("phone") || ""));
    if (!phone) {
      return {
        ok: false as const,
        error: "Indica um telemóvel válido (ex.: +351912345678).",
      };
    }
  }

  if (family.kind === "INDIVIDUAL") {
    await prisma.family.update({
      where: { id: family.id },
      data: { kind: "FAMILY", inviteCode: family.inviteCode || makeInviteCode() },
    });
  }

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);
  const invite = await prisma.familyInvite.create({
    data: {
      familyId: family.id,
      token,
      createdById: session.user.id,
      channel,
      email,
      phone,
      inviteeName: name,
      label: name,
      expiresAt,
    },
  });

  const invitePath = `/pt/convite/${invite.token}`;
  const { deliverFamilyInvite } = await import("@/lib/invites/delivery");
  const delivery = await deliverFamilyInvite({
    channel,
    toEmail: email,
    toPhone: phone,
    inviteeName: name,
    familyName: family.name,
    invitePath,
  });

  if (!delivery.ok) {
    return { ok: false as const, error: delivery.error };
  }

  revalidateAll();
  return {
    ok: true as const,
    invitePath,
    channel,
    delivered: delivery.delivered,
    previewUrl: delivery.previewUrl,
    smsReady: false as const,
  };
}

export async function revokeFamilyInvite(inviteId: string) {
  const { membership, family } = await requireFamilyContext();
  if (!canManageMembers(membership.role)) {
    return { ok: false as const, error: "Sem permissão." };
  }
  const invite = await prisma.familyInvite.findFirst({
    where: { id: inviteId, familyId: family.id, acceptedAt: null },
  });
  if (!invite) return { ok: false as const, error: "Convite não encontrado." };
  await prisma.familyInvite.update({
    where: { id: invite.id },
    data: { revokedAt: new Date() },
  });
  revalidateAll();
  return { ok: true as const };
}

export async function resendFamilyInvite(inviteId: string) {
  const { membership, family } = await requireFamilyContext();
  if (!canManageMembers(membership.role)) {
    return { ok: false as const, error: "Sem permissão." };
  }
  const invite = await prisma.familyInvite.findFirst({
    where: {
      id: inviteId,
      familyId: family.id,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (!invite) return { ok: false as const, error: "Convite não encontrado ou expirado." };

  const channel = (invite.channel === "PHONE" ? "PHONE" : invite.email ? "EMAIL" : "LINK") as
    | "EMAIL"
    | "PHONE"
    | "LINK";
  const invitePath = `/pt/convite/${invite.token}`;
  const { deliverFamilyInvite } = await import("@/lib/invites/delivery");
  const delivery = await deliverFamilyInvite({
    channel: channel === "LINK" ? "EMAIL" : channel,
    toEmail: invite.email,
    toPhone: invite.phone,
    inviteeName: invite.inviteeName || "Familiar",
    familyName: family.name,
    invitePath,
  });
  if (!delivery.ok) return { ok: false as const, error: delivery.error };
  revalidateAll();
  return {
    ok: true as const,
    invitePath,
    delivered: delivery.delivered,
    previewUrl: delivery.previewUrl,
    channel,
  };
}

/** Remover membro da família (não remove a conta individual do utilizador). */
export async function removeFamilyMember(memberId: string) {
  const { session, membership, family } = await requireFamilyContext();
  if (!canManageMembers(membership.role)) {
    return { ok: false as const, error: "Sem permissão." };
  }
  const target = await prisma.familyMember.findFirst({
    where: { id: memberId, familyId: family.id },
  });
  if (!target) return { ok: false as const, error: "Membro não encontrado." };
  if (target.role === "OWNER") {
    return { ok: false as const, error: "Não é possível remover o proprietário." };
  }
  if (target.userId === session.user.id) {
    return { ok: false as const, error: "Não podes remover-te a ti próprio aqui." };
  }
  await prisma.familyMember.delete({ where: { id: target.id } });
  revalidateAll();
  return { ok: true as const };
}

/** Aceitar convite criando a própria conta (palavra-passe + email se necessário). */
export async function acceptInviteSetPassword(formData: FormData) {
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const emailFromForm = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const { validatePassword } = await import("@/lib/auth/password-rules");
  const pwd = validatePassword(password);
  if (!pwd.ok) return { ok: false as const, error: pwd.error };

  const invite = await prisma.familyInvite.findUnique({
    where: { token },
    include: { family: true },
  });
  if (
    !invite ||
    invite.acceptedAt ||
    invite.revokedAt ||
    invite.expiresAt < new Date()
  ) {
    return { ok: false as const, error: "Convite inválido ou expirado." };
  }

  const email = (invite.email || emailFromForm || "").toLowerCase();
  const displayName = invite.inviteeName || "Membro";
  if (!email) {
    return {
      ok: false as const,
      error: "Indica o teu email para criares a tua própria conta.",
    };
  }

  let user = await prisma.user.findUnique({ where: { email } });
  const passwordHash = await bcrypt.hash(password, 10);
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: displayName,
        email,
        phone: invite.phone || undefined,
        passwordHash,
        emailVerified: new Date(),
      },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        emailVerified: new Date(),
        ...(invite.phone && !user.phone ? { phone: invite.phone } : {}),
      },
    });
  }

  await prisma.familyMember.upsert({
    where: { familyId_userId: { familyId: invite.familyId, userId: user.id } },
    create: {
      familyId: invite.familyId,
      userId: user.id,
      displayName,
      role: "MEMBER",
    },
    update: { displayName, role: "MEMBER" },
  });

  await prisma.familyInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date(), acceptedById: user.id },
  });

  revalidateAll();
  return { ok: true as const, email, familyName: invite.family.name };
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

export async function updateNinaPersonalization(formData: FormData) {
  const session = await requireSession();
  const theme = String(formData.get("theme") || "system");
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      theme: ["light", "dark", "system", "blue", "green", "purple"].includes(theme)
        ? theme
        : "system",
      ninaTone: ["formal", "casual", "motivational", "empathetic"].includes(
        String(formData.get("ninaTone") || "empathetic"),
      )
        ? String(formData.get("ninaTone") || "empathetic")
        : "empathetic",
      ninaAvatar: ["classic", "modern", "minimal", "feminine", "masculine"].includes(
        String(formData.get("ninaAvatar") || "classic"),
      )
        ? String(formData.get("ninaAvatar") || "classic")
        : "classic",
      ninaVoice: String(formData.get("ninaVoice") || "").trim() || null,
    },
  });
  revalidateAll();
  return { ok: true as const };
}

export async function updateProfile(formData: FormData) {
  const session = await requireSession();
  const preferredName = String(formData.get("preferredName") || "").trim();
  const fullName = String(formData.get("name") || "").trim();
  const howToCall = preferredName || fullName;
  const theme = String(formData.get("theme") || "system");
  const biometricsEnabled = formData.get("biometrics") === "on";
  const pin = String(formData.get("pin") || "").trim();

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: fullName || howToCall || undefined,
      theme: ["light", "dark", "system", "blue", "green", "purple"].includes(theme)
        ? theme
        : "system",
      biometricsEnabled,
      pinHash: pin.length >= 4 ? await bcrypt.hash(pin, 10) : undefined,
      ninaReplyStyle: ["auto", "short", "balanced", "detailed"].includes(
        String(formData.get("ninaReplyStyle") || "auto"),
      )
        ? String(formData.get("ninaReplyStyle") || "auto")
        : "auto",
      ninaHumor: ["auto", "off", "light"].includes(String(formData.get("ninaHumor") || "auto"))
        ? String(formData.get("ninaHumor") || "auto")
        : "auto",
      ninaTone: ["formal", "casual", "motivational", "empathetic"].includes(
        String(formData.get("ninaTone") || "empathetic"),
      )
        ? String(formData.get("ninaTone") || "empathetic")
        : "empathetic",
      ninaAvatar: ["classic", "modern", "minimal", "feminine", "masculine"].includes(
        String(formData.get("ninaAvatar") || "classic"),
      )
        ? String(formData.get("ninaAvatar") || "classic")
        : "classic",
      ninaVoice: String(formData.get("ninaVoice") || "").trim() || null,
    },
  });

  const membership = await prisma.familyMember.findFirst({
    where: { userId: session.user.id },
  });
  if (membership && howToCall) {
    await prisma.familyMember.update({
      where: { id: membership.id },
      data: { displayName: howToCall },
    });
  }
  revalidateAll();
  return { ok: true as const };
}
