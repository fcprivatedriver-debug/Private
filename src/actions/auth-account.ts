"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import {
  appBaseUrl,
  createRawToken,
  hashToken,
  sendAppEmail,
  validatePassword,
  PASSWORD_HINT,
} from "@/lib/auth/security";
import { registerSchema } from "@/lib/validators";
import { requireSession } from "@/lib/session";

const VERIFY_HOURS = 48;
const RESET_HOURS = 2;

function isTestEmail(email: string) {
  return /@(nina\.app)$/i.test(email) || process.env.AUTH_SKIP_EMAIL_VERIFY === "true";
}

async function storeToken(identifier: string, raw: string, hours: number) {
  const token = hashToken(raw);
  const expires = new Date(Date.now() + hours * 3600_000);
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: { identifier, token, expires },
  });
  return expires;
}

async function consumeToken(identifierPrefix: string, raw: string) {
  const token = hashToken(raw);
  const row = await prisma.verificationToken.findFirst({
    where: { token },
  });
  if (!row || row.expires < new Date()) return null;
  if (!row.identifier.startsWith(identifierPrefix)) return null;
  await prisma.verificationToken.delete({
    where: { identifier_token: { identifier: row.identifier, token: row.token } },
  }).catch(async () => {
    await prisma.verificationToken.deleteMany({ where: { token } });
  });
  return row.identifier;
}

export async function registerFamily(formData: FormData) {
  try {
    const parsed = registerSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      familyName: formData.get("familyName") || undefined,
    });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Dados inválidos";
      return { ok: false as const, error: msg };
    }

    const pwd = validatePassword(parsed.data.password);
    if (!pwd.ok) return { ok: false as const, error: pwd.error };

    const email = parsed.data.email.toLowerCase();
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return { ok: false as const, error: "Email já registado" };

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const skipVerify = isTestEmail(email);
    const familyName = (parsed.data.familyName || "Família").trim() || "Família";

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash,
        emailVerified: skipVerify ? new Date() : null,
      },
    });

    const family = await prisma.family.create({
      data: {
        name: familyName,
        kind: "INDIVIDUAL",
      },
    });

    await prisma.familyMember.create({
      data: {
        familyId: family.id,
        userId: user.id,
        displayName: parsed.data.name.trim(),
        role: "OWNER",
      },
    });

    await prisma.financeAccount.create({
      data: {
        familyId: family.id,
        name: "Conta principal",
        type: "CHECKING",
        balanceCents: 0,
      },
    });

    await prisma.shoppingList.create({
      data: {
        familyId: family.id,
        createdById: user.id,
        name: "Lista de compras",
        isShared: true,
      },
    });

    if (skipVerify) {
      return { ok: true as const, needsVerification: false as const };
    }

    const raw = createRawToken();
    await storeToken(`verify:${email}`, raw, VERIFY_HOURS);
    const verifyUrl = `${appBaseUrl()}/pt/verificar/${raw}`;
    const mail = await sendAppEmail({
      to: email,
      subject: "Confirma o teu email na Nina",
      text: `Olá ${parsed.data.name.split(" ")[0]},\n\nConfirma o teu email para activar a Nina:\n${verifyUrl}\n\nO link é válido por ${VERIFY_HOURS} horas.\n\n— Nina`,
    });

    return {
      ok: true as const,
      needsVerification: true as const,
      email,
      previewUrl: mail.ok && !mail.delivered ? verifyUrl : undefined,
      mailDelivered: mail.ok ? mail.delivered : false,
    };
  } catch (err) {
    console.error("[registerFamily]", err);
    return {
      ok: false as const,
      error: "Não consegui criar a conta agora. Tenta daqui a um momento.",
    };
  }
}

export async function verifyEmailToken(rawToken: string) {
  const id = await consumeToken("verify:", rawToken);
  if (!id) return { ok: false as const, error: "Link inválido ou expirado." };
  const email = id.replace(/^verify:/, "");
  await prisma.user.update({
    where: { email },
    data: { emailVerified: new Date() },
  });
  return { ok: true as const, email };
}

export async function resendVerificationEmail(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { ok: true as const }; // não revelar
  if (user.emailVerified) return { ok: true as const, already: true as const };

  const raw = createRawToken();
  await storeToken(`verify:${email}`, raw, VERIFY_HOURS);
  const verifyUrl = `${appBaseUrl()}/pt/verificar/${raw}`;
  const mail = await sendAppEmail({
    to: email,
    subject: "Confirma o teu email na Nina",
    text: `Confirma o teu email:\n${verifyUrl}\n\n— Nina`,
  });
  return {
    ok: true as const,
    previewUrl: mail.ok && !mail.delivered ? verifyUrl : undefined,
  };
}

export async function requestPasswordReset(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) {
    return { ok: true as const }; // silencioso
  }
  const raw = createRawToken();
  await storeToken(`reset:${email}`, raw, RESET_HOURS);
  const url = `${appBaseUrl()}/pt/recuperar/${raw}`;
  const mail = await sendAppEmail({
    to: email,
    subject: "Recuperar palavra-passe — Nina",
    text: `Para definires uma nova palavra-passe:\n${url}\n\nVálido por ${RESET_HOURS} horas.\n\n— Nina`,
  });
  return {
    ok: true as const,
    previewUrl: mail.ok && !mail.delivered ? url : undefined,
  };
}

export async function resetPasswordWithToken(rawToken: string, newPassword: string) {
  const pwd = validatePassword(newPassword);
  if (!pwd.ok) return { ok: false as const, error: pwd.error };

  const id = await consumeToken("reset:", rawToken);
  if (!id) return { ok: false as const, error: "Link inválido ou expirado." };
  const email = id.replace(/^reset:/, "");
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { email },
    data: { passwordHash, emailVerified: new Date() },
  });
  return { ok: true as const };
}

export async function changePassword(formData: FormData) {
  const session = await requireSession();
  const current = String(formData.get("currentPassword") || "");
  const next = String(formData.get("newPassword") || "");
  const pwd = validatePassword(next);
  if (!pwd.ok) return { ok: false as const, error: pwd.error };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.passwordHash) return { ok: false as const, error: "Conta sem palavra-passe." };
  const valid = await bcrypt.compare(current, user.passwordHash);
  if (!valid) return { ok: false as const, error: "Palavra-passe actual incorrecta." };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 10) },
  });
  return { ok: true as const };
}

export async function checkEmailVerified(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { emailVerified: true, passwordHash: true },
  });
  if (!user?.passwordHash) return { ok: true as const }; // login falhará normalmente
  if (!user.emailVerified) {
    return { ok: false as const, reason: "EMAIL_NOT_VERIFIED" as const };
  }
  return { ok: true as const };
}
