"use server";

import { hash, compare } from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { notify, sendEmail } from "@/lib/notifications";
import { issueAndSendActivationEmail } from "@/lib/auth/activation";
import { auth, signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { addHours } from "date-fns";

const registerSchema = z
  .object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(9),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    acceptTerms: z.literal("on"),
    acceptPrivacy: z.literal("on"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As palavras-passe não coincidem",
    path: ["confirmPassword"],
  });

export type ActionState = {
  error?: string;
  success?: string;
  warning?: string;
  email?: string;
  /** expired | invalid | missing — used by /ativar UI */
  code?: "expired" | "invalid" | "missing" | "already_verified";
};

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    acceptTerms: formData.get("acceptTerms"),
    acceptPrivacy: formData.get("acceptPrivacy"),
  });

  if (!parsed.success) {
    return { error: "Preencha todos os campos corretamente e aceite os termos." };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Já existe uma conta com este e-mail." };

  const passwordHash = await hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      phone: parsed.data.phone,
      passwordHash,
      role: "CUSTOMER",
      status: "PENDING_EMAIL",
      emailVerified: null,
      customerProfile: {
        create: {
          fullName: parsed.data.name,
          phone: parsed.data.phone,
        },
      },
    },
  });

  const { email: sendResult } = await issueAndSendActivationEmail({
    userId: user.id,
    email,
    name: parsed.data.name,
    reason: "Registo de nova conta",
  });

  await notify({
    userId: user.id,
    email,
    type: "ACCOUNT_CREATED",
    title: "Conta criada",
    body: "Confirme o seu e-mail para ativar a conta e poder contratar um plano.",
    channels: ["IN_APP"],
  });

  if (!sendResult.ok) {
    return {
      success: "Conta criada.",
      warning:
        "Não foi possível enviar o e-mail de ativação automaticamente. Pode reenviar abaixo. Se o problema continuar, contacte-nos.",
      email,
    };
  }

  return {
    success:
      "Conta criada. Enviámos um e-mail com o botão «Ativar Conta». Confirme o endereço antes de contratar um plano. O link expira em 24 horas.",
    email,
  };
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") || "").toLowerCase();
  const password = String(formData.get("password") || "");
  const requestedCallback = String(formData.get("callbackUrl") || "").trim();

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });
  const roleHome =
    existing?.role === "ADMIN"
      ? "/pt/admin"
      : existing?.role === "DRIVER"
        ? "/pt/motorista"
        : "/pt/cliente";
  // Honour explicit deep-links; otherwise send each role to its home.
  const callbackUrl =
    requestedCallback &&
    requestedCallback !== "/pt/cliente" &&
    !requestedCallback.endsWith("/cliente")
      ? requestedCallback
      : roleHome;

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "E-mail ou palavra-passe incorretos." };
    }
    throw err;
  }
  return {};
}

export async function activateAccountAction(token: string): Promise<ActionState> {
  if (!token) {
    return { error: "Link de ativação em falta.", code: "missing" };
  }

  const row = await prisma.emailConfirmToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!row) {
    return {
      error: "Link de ativação inválido.",
      code: "invalid",
    };
  }

  if (row.user.emailVerified) {
    // Clean leftover tokens and treat as success
    await prisma.emailConfirmToken.deleteMany({ where: { userId: row.userId } });
    return {
      success:
        "O seu e-mail foi confirmado com sucesso.\nJá pode iniciar sessão e contratar um plano.",
      code: "already_verified",
      email: row.user.email,
    };
  }

  if (row.usedAt) {
    return {
      error: "Este link de ativação já foi utilizado.",
      code: "invalid",
      email: row.user.email,
    };
  }

  if (row.expiresAt < new Date()) {
    return {
      error: "O link de ativação expirou. Peça um novo e-mail de ativação.",
      code: "expired",
      email: row.user.email,
    };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { emailVerified: new Date(), status: "ACTIVE" },
    }),
    prisma.emailConfirmToken.deleteMany({ where: { userId: row.userId } }),
  ]);

  await notify({
    userId: row.userId,
    email: row.user.email,
    type: "EMAIL_CONFIRMED",
    title: "E-mail confirmado",
    body: "A sua conta está ativa. Já pode escolher um plano.",
    channels: ["IN_APP"],
  });

  await prisma.adminAuditLog.create({
    data: {
      action: "EMAIL_VERIFIED",
      entityType: "User",
      entityId: row.userId,
      reason: "Conta ativada via link de e-mail",
      meta: JSON.stringify({ email: row.user.email }),
    },
  });

  return {
    success:
      "O seu e-mail foi confirmado com sucesso.\nJá pode iniciar sessão e contratar um plano.",
    email: row.user.email,
  };
}

/** Public resend — by e-mail (does not reveal whether the account exists). */
export async function resendActivationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "Indique um e-mail válido." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return {
      success:
        "Se existir uma conta por confirmar com este e-mail, enviámos um novo link de ativação.",
      email,
    };
  }

  if (user.emailVerified) {
    return {
      success: "Este e-mail já está confirmado. Pode iniciar sessão.",
      email,
      code: "already_verified",
    };
  }

  const { email: sendResult } = await issueAndSendActivationEmail({
    userId: user.id,
    email: user.email,
    name: user.name,
    reason: "Reenvio público de ativação",
  });

  if (!sendResult.ok) {
    return {
      error:
        "Não foi possível enviar o e-mail de ativação. Tente novamente mais tarde ou contacte-nos.",
      email,
    };
  }

  return {
    success: "Enviámos um novo e-mail de ativação. Verifique a caixa de entrada (e o spam).",
    email,
  };
}

export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") || "").toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { success: "Se o e-mail existir, enviámos instruções de recuperação." };
  }

  const token = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt: addHours(new Date(), 2) },
  });

  const href = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/pt/recuperar?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Recuperar palavra-passe — FC Private Driver",
    html: `<p>Clique para definir uma nova palavra-passe:</p><p><a href="${href}">Redefinir palavra-passe</a></p>`,
  });

  return { success: "Se o e-mail existir, enviámos instruções de recuperação." };
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirmPassword") || "");
  if (password.length < 8 || password !== confirm) {
    return { error: "A palavra-passe deve ter pelo menos 8 caracteres e coincidir." };
  }

  const row = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return { error: "Link inválido ou expirado." };
  }

  const passwordHash = await hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { success: "Palavra-passe atualizada. Já pode iniciar sessão." };
}

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão inválida." };

  const data = {
    fullName: String(formData.get("fullName") || ""),
    addressLine: String(formData.get("addressLine") || ""),
    postalCode: String(formData.get("postalCode") || ""),
    city: String(formData.get("city") || ""),
    birthDate: formData.get("birthDate")
      ? new Date(String(formData.get("birthDate")))
      : null,
    taxId: String(formData.get("taxId") || "") || null,
    phone: String(formData.get("phone") || ""),
    altPhone: String(formData.get("altPhone") || "") || null,
    notes: String(formData.get("notes") || "") || null,
  };

  if (!data.fullName || !data.addressLine || !data.postalCode || !data.city || !data.phone) {
    return { error: "Preencha os campos obrigatórios do perfil." };
  }

  await prisma.customerProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      ...data,
      profileComplete: true,
    },
    update: {
      ...data,
      profileComplete: true,
    },
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: data.fullName, phone: data.phone },
  });

  revalidatePath("/pt/perfil");
  revalidatePath("/pt/cliente");
  return { success: "Perfil atualizado." };
}

export async function updateHabitsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão inválida." };

  const profile = await prisma.customerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) return { error: "Complete o perfil primeiro." };

  const weekdays = formData.getAll("weekdays").map(String);

  await prisma.customerTravelHabit.upsert({
    where: { customerProfileId: profile.id },
    create: {
      customerProfileId: profile.id,
      tripsCount: Number(formData.get("tripsCount") || 0) || null,
      frequencyUnit: String(formData.get("frequencyUnit") || "") || null,
      weekdays: JSON.stringify(weekdays),
      usualTimes: String(formData.get("usualTimes") || "") || null,
      usualPickups: String(formData.get("usualPickups") || "") || null,
      usualDestinations: String(formData.get("usualDestinations") || "") || null,
      oftenAirport: formData.get("oftenAirport") === "on",
      oftenRoundTrip: formData.get("oftenRoundTrip") === "on",
      needsWaiting: formData.get("needsWaiting") === "on",
      travelsAlone: formData.get("travelsAlone") === "yes" ? true : formData.get("travelsAlone") === "no" ? false : null,
      avgPassengers: Number(formData.get("avgPassengers") || 0) || null,
      needsChildSeat: formData.get("needsChildSeat") === "on",
      oftenLuggage: formData.get("oftenLuggage") === "on",
      otherPreferences: String(formData.get("otherPreferences") || "") || null,
    },
    update: {
      tripsCount: Number(formData.get("tripsCount") || 0) || null,
      frequencyUnit: String(formData.get("frequencyUnit") || "") || null,
      weekdays: JSON.stringify(weekdays),
      usualTimes: String(formData.get("usualTimes") || "") || null,
      usualPickups: String(formData.get("usualPickups") || "") || null,
      usualDestinations: String(formData.get("usualDestinations") || "") || null,
      oftenAirport: formData.get("oftenAirport") === "on",
      oftenRoundTrip: formData.get("oftenRoundTrip") === "on",
      needsWaiting: formData.get("needsWaiting") === "on",
      travelsAlone: formData.get("travelsAlone") === "yes" ? true : formData.get("travelsAlone") === "no" ? false : null,
      avgPassengers: Number(formData.get("avgPassengers") || 0) || null,
      needsChildSeat: formData.get("needsChildSeat") === "on",
      oftenLuggage: formData.get("oftenLuggage") === "on",
      otherPreferences: String(formData.get("otherPreferences") || "") || null,
    },
  });

  await prisma.customerProfile.update({
    where: { id: profile.id },
    data: { habitsComplete: true },
  });

  revalidatePath("/pt/habitos");
  return { success: "Hábitos de deslocação guardados. Obrigado — isto ajuda-nos a conhecê-lo melhor." };
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão inválida." };
  const current = String(formData.get("currentPassword") || "");
  const next = String(formData.get("newPassword") || "");
  const confirm = String(formData.get("confirmPassword") || "");
  if (next.length < 8 || next !== confirm) {
    return { error: "Nova palavra-passe inválida." };
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.passwordHash) return { error: "Conta sem palavra-passe." };
  const ok = await compare(current, user.passwordHash);
  if (!ok) return { error: "Palavra-passe atual incorreta." };
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hash(next, 12) },
  });
  return { success: "Palavra-passe atualizada." };
}

export async function requestAccountDeletionAction(): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão inválida." };
  await prisma.user.update({
    where: { id: session.user.id },
    data: { status: "DELETION_REQUESTED" },
  });
  await prisma.customerProfile.updateMany({
    where: { userId: session.user.id },
    data: { deletionRequestedAt: new Date() },
  });
  return { success: "Pedido de eliminação registado. Contactaremos para confirmar." };
}

export async function exportMyDataAction() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const data = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      customerProfile: { include: { travelHabits: true, addresses: true } },
      subscriptions: { include: { plan: true } },
      payments: true,
      trips: true,
      minuteTransactions: true,
      notifications: true,
    },
  });
  return data;
}
