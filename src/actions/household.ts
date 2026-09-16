"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireFamilyContext, requireSession } from "@/lib/session";
import { canManageMembers, makeInviteCode } from "@/domain/household";
import type { FamilyRole, FinanceScope, HouseholdKind } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  canResendInvite,
  hashInviteToken,
  inviteExpiryDate,
  issueInviteToken,
  maskEmail,
  normalizeInviteEmail,
  resendCooldownSeconds,
} from "@/lib/invites/tokens";

function revalidateAll() {
  revalidatePath("/", "layout");
}

async function findInviteByRawToken(raw: string) {
  const token = hashInviteToken(raw);
  return prisma.familyInvite.findUnique({
    where: { token },
    include: { family: true, createdBy: { select: { name: true, email: true } } },
  });
}

/** Remove membership INDIVIDUAL órfã ao aderir a uma Família convidada. */
async function detachIndividualMembership(userId: string, keepFamilyId: string) {
  const olds = await prisma.familyMember.findMany({
    where: { userId, familyId: { not: keepFamilyId } },
    include: { family: true },
  });
  for (const old of olds) {
    if (old.family.kind === "INDIVIDUAL") {
      await prisma.familyMember.delete({ where: { id: old.id } }).catch(() => undefined);
      const remaining = await prisma.familyMember.count({ where: { familyId: old.familyId } });
      if (remaining === 0) {
        await prisma.family.delete({ where: { id: old.familyId } }).catch(() => undefined);
      }
    }
  }
}

function parseInviteRole(raw: FormDataEntryValue | null): FamilyRole {
  const v = String(raw || "MEMBER").toUpperCase();
  if (v === "ADMIN" || v === "MEMBER" || v === "VIEWER") return v;
  return "MEMBER";
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

  const { raw, hash } = issueInviteToken();
  const expiresAt = inviteExpiryDate(30);
  const now = new Date();

  await prisma.familyInvite.create({
    data: {
      familyId: family.id,
      token: hash,
      createdById: session.user.id,
      label: "Convite familiar",
      channel: "LINK",
      expiresAt,
      lastSentAt: now,
    },
  });

  await setNinaSpace("family");
  revalidateAll();

  return {
    ok: true as const,
    inviteToken: raw,
    invitePath: `/pt/convite/${raw}`,
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

  const { raw, hash } = issueInviteToken();
  const expiresAt = inviteExpiryDate(30);
  await prisma.familyInvite.create({
    data: {
      familyId: family.id,
      token: hash,
      createdById: session.user.id,
      channel: "LINK",
      expiresAt,
      lastSentAt: new Date(),
    },
  });

  revalidateAll();
  return {
    ok: true as const,
    inviteToken: raw,
    invitePath: `/pt/convite/${raw}`,
  };
}

export async function acceptFamilyInvite(rawToken: string) {
  const session = await requireSession();
  const invite = await findInviteByRawToken(rawToken);
  if (!invite) {
    return { ok: false as const, error: "Este convite já não é válido." };
  }
  if (invite.revokedAt) {
    return { ok: false as const, error: "Este convite já não é válido." };
  }
  if (invite.acceptedAt) {
    return { ok: false as const, error: "Este convite já foi utilizado." };
  }
  if (invite.expiresAt < new Date()) {
    return { ok: false as const, error: "Este convite expirou." };
  }

  // Se o convite tem email, a sessão tem de corresponder ao destinatário
  if (invite.email) {
    const sessionEmail = (session.user.email || "").toLowerCase();
    if (!sessionEmail || sessionEmail !== invite.email.toLowerCase()) {
      return {
        ok: false as const,
        error:
          "Este convite é para outro email. Entra com a conta correcta ou cria a tua própria conta.",
      };
    }
  }

  const existing = await prisma.familyMember.findUnique({
    where: {
      familyId_userId: { familyId: invite.familyId, userId: session.user.id },
    },
  });

  const role: FamilyRole =
    invite.inviteRole === "ADMIN" || invite.inviteRole === "VIEWER" || invite.inviteRole === "MEMBER"
      ? invite.inviteRole
      : "MEMBER";

  if (!existing) {
    await detachIndividualMembership(session.user.id, invite.familyId);
    await prisma.familyMember.create({
      data: {
        familyId: invite.familyId,
        userId: session.user.id,
        displayName: invite.inviteeName || session.user.name || "Membro",
        role,
      },
    });
  }

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
      title: "Bem-vindo à Família",
      message: `Já estás ligado a “${invite.family.name}”. O espaço Familiar está disponível — o teu Pessoal continua só teu.`,
      level: "success",
    },
  });

  await setNinaSpace("family");
  revalidateAll();
  return { ok: true as const, familyName: invite.family.name };
}

/** Recusar convite (pelo destinatário). */
export async function declineFamilyInvite(rawToken: string) {
  const invite = await findInviteByRawToken(rawToken);
  if (!invite) return { ok: false as const, error: "Este convite já não é válido." };
  if (invite.acceptedAt) return { ok: false as const, error: "Este convite já foi utilizado." };
  if (invite.revokedAt) return { ok: false as const, error: "Este convite já não é válido." };
  if (invite.expiresAt < new Date()) return { ok: false as const, error: "Este convite expirou." };

  await prisma.familyInvite.update({
    where: { id: invite.id },
    data: { revokedAt: new Date() },
  });
  revalidateAll();
  return { ok: true as const };
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
  const family = await prisma.family.findUnique({ where: { inviteCode: code } });
  if (!family) return { ok: false as const, error: "Código inválido." };

  const { session } = await requireFamilyContext();
  const { raw, hash } = issueInviteToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);
  await prisma.familyInvite.create({
    data: {
      familyId: family.id,
      token: hash,
      createdById: session.user.id,
      expiresAt,
      lastSentAt: new Date(),
    },
  });
  return acceptFamilyInvite(raw);
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

  const name =
    String(formData.get("name") || "").trim() ||
    (channel === "EMAIL"
      ? String(formData.get("email") || "").trim().split("@")[0] || "Familiar"
      : "Familiar");

  let email: string | null = null;
  let phone: string | null = null;

  if (channel === "EMAIL") {
    email = normalizeInviteEmail(String(formData.get("email") || ""));
    if (!email) return { ok: false as const, error: "Indica um email válido." };
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

  const inviteRole = parseInviteRole(formData.get("role"));
  // Nunca convidar directamente como OWNER
  const safeRole: FamilyRole = inviteRole === "ADMIN" || inviteRole === "VIEWER" ? inviteRole : "MEMBER";

  if (email) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const already = await prisma.familyMember.findUnique({
        where: { familyId_userId: { familyId: family.id, userId: existingUser.id } },
      });
      if (already) {
        return { ok: false as const, error: "Este email já é membro desta Família." };
      }
    }
    const pending = await prisma.familyInvite.findFirst({
      where: {
        familyId: family.id,
        email,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (pending) {
      return {
        ok: false as const,
        error: "Já existe um convite pendente para este email. Reenvia ou cancela o anterior.",
      };
    }
  }

  if (family.kind === "INDIVIDUAL") {
    await prisma.family.update({
      where: { id: family.id },
      data: { kind: "FAMILY", inviteCode: family.inviteCode || makeInviteCode() },
    });
  }

  const { raw, hash } = issueInviteToken();
  const expiresAt = inviteExpiryDate(14);
  const now = new Date();
  await prisma.familyInvite.create({
    data: {
      familyId: family.id,
      token: hash,
      createdById: session.user.id,
      channel,
      email,
      phone,
      inviteeName: name,
      label: name,
      inviteRole: safeRole,
      expiresAt,
      lastSentAt: now,
    },
  });

  const invitePath = `/pt/convite/${raw}`;
  const { deliverFamilyInvite } = await import("@/lib/invites/delivery");
  const delivery = await deliverFamilyInvite({
    channel,
    toEmail: email,
    toPhone: phone,
    inviteeName: name,
    inviterName: session.user.name || membership.displayName || "Alguém",
    familyName: family.name,
    invitePath,
  });

  if (!delivery.ok) {
    // Convite ficou criado — OWNER pode reenviar. Não apagar.
    return {
      ok: false as const,
      error: delivery.error,
      invitePath,
      maskedEmail: email ? maskEmail(email) : undefined,
    };
  }

  revalidateAll();
  return {
    ok: true as const,
    invitePath,
    channel,
    delivered: delivery.delivered,
    previewUrl: delivery.previewUrl,
    smsReady: false as const,
    maskedEmail: email ? maskEmail(email) : undefined,
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
  const { session, membership, family } = await requireFamilyContext();
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

  if (!canResendInvite(invite.lastSentAt)) {
    const sec = resendCooldownSeconds(invite.lastSentAt || invite.createdAt);
    return {
      ok: false as const,
      error: `Aguarda ${sec}s antes de reenviar para evitar spam.`,
    };
  }

  // Rodar token em cada reenvio (one-time semantics + link fresco)
  const { raw, hash } = issueInviteToken();
  const expiresAt = inviteExpiryDate(14);
  const now = new Date();
  await prisma.familyInvite.update({
    where: { id: invite.id },
    data: { token: hash, expiresAt, lastSentAt: now },
  });

  const channel = (invite.channel === "PHONE" ? "PHONE" : invite.email ? "EMAIL" : "LINK") as
    | "EMAIL"
    | "PHONE"
    | "LINK";
  const invitePath = `/pt/convite/${raw}`;
  const { deliverFamilyInvite } = await import("@/lib/invites/delivery");
  const delivery = await deliverFamilyInvite({
    channel: channel === "LINK" ? "EMAIL" : channel,
    toEmail: invite.email,
    toPhone: invite.phone,
    inviteeName: invite.inviteeName || "Familiar",
    inviterName: session.user.name || membership.displayName || "Alguém",
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
    maskedEmail: invite.email ? maskEmail(invite.email) : undefined,
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
  const rawToken = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const emailFromForm = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const { validatePassword } = await import("@/lib/auth/password-rules");
  const pwd = validatePassword(password);
  if (!pwd.ok) return { ok: false as const, error: pwd.error };

  const invite = await findInviteByRawToken(rawToken);
  if (!invite) {
    return { ok: false as const, error: "Este convite já não é válido." };
  }
  if (invite.revokedAt) {
    return { ok: false as const, error: "Este convite já não é válido." };
  }
  if (invite.acceptedAt) {
    return { ok: false as const, error: "Este convite já foi utilizado." };
  }
  if (invite.expiresAt < new Date()) {
    return { ok: false as const, error: "Este convite expirou." };
  }

  const email = normalizeInviteEmail(invite.email || emailFromForm || "");
  const displayName = invite.inviteeName || "Membro";
  if (!email) {
    return {
      ok: false as const,
      error: "Indica o teu email para criares a tua própria conta.",
    };
  }
  if (invite.email && email !== invite.email.toLowerCase()) {
    return {
      ok: false as const,
      error: "Este convite é para outro email.",
    };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.passwordHash) {
    return {
      ok: false as const,
      error: "Já existe uma conta com este email. Entra com as tuas credenciais e aceita o convite.",
      needsLogin: true as const,
      email,
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const skipVerify =
    process.env.AUTH_SKIP_EMAIL_VERIFY === "true" &&
    process.env.VERCEL_ENV !== "production" &&
    process.env.NODE_ENV !== "production";

  let user = existing;
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: displayName,
        email,
        phone: invite.phone || undefined,
        passwordHash,
        emailVerified: skipVerify ? new Date() : null,
      },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        ...(invite.phone && !user.phone ? { phone: invite.phone } : {}),
        ...(skipVerify && !user.emailVerified ? { emailVerified: new Date() } : {}),
      },
    });
  }

  if (!skipVerify && !user.emailVerified) {
    const { createRawToken, hashToken, sendAppEmail, appBaseUrl } = await import(
      "@/lib/auth/security"
    );
    const raw = createRawToken();
    const token = hashToken(raw);
    const expires = new Date(Date.now() + 48 * 3600_000);
    await prisma.verificationToken.deleteMany({ where: { identifier: `verify:${email}` } });
    await prisma.verificationToken.create({
      data: { identifier: `verify:${email}`, token, expires },
    });
    const verifyUrl = `${appBaseUrl()}/pt/verificar/${raw}?callbackUrl=${encodeURIComponent(`/pt/convite/${rawToken}`)}`;
    await sendAppEmail({
      to: email,
      subject: "Confirma o teu email na addYknow",
      text: `Olá ${displayName},\n\nConfirma o teu email para aceitares o convite familiar:\n${verifyUrl}\n\n— addYknow`,
    });
    revalidateAll();
    return {
      ok: true as const,
      needsVerification: true as const,
      email,
      familyName: invite.family.name,
      invitePath: `/pt/convite/${rawToken}`,
    };
  }

  const role: FamilyRole =
    invite.inviteRole === "ADMIN" || invite.inviteRole === "VIEWER" || invite.inviteRole === "MEMBER"
      ? invite.inviteRole
      : "MEMBER";

  await detachIndividualMembership(user.id, invite.familyId);

  await prisma.familyMember.upsert({
    where: { familyId_userId: { familyId: invite.familyId, userId: user.id } },
    create: {
      familyId: invite.familyId,
      userId: user.id,
      displayName,
      role,
    },
    update: { displayName },
  });

  await prisma.familyInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date(), acceptedById: user.id },
  });

  revalidateAll();
  return {
    ok: true as const,
    email,
    familyName: invite.family.name,
    needsVerification: false as const,
  };
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
