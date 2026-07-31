"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/actions/auth";
import { hash } from "bcryptjs";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

export async function updateSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await requireAdmin())) return { error: "Sem permissão." };

  await prisma.siteSettings.update({
    where: { id: "default" },
    data: {
      brandName: String(formData.get("brandName") || "FC Private Driver"),
      supportEmail: String(formData.get("supportEmail") || ""),
      supportPhone: String(formData.get("supportPhone") || ""),
      whatsappNumber: String(formData.get("whatsappNumber") || ""),
      toleranceMinutes: Number(formData.get("toleranceMinutes") || 10),
      minimumChargeMinutes: Number(formData.get("minimumChargeMinutes") || 15),
      lowBalanceThreshold: Number(formData.get("lowBalanceThreshold") || 60),
      maxPickupDistanceKm: Number(formData.get("maxPickupDistanceKm") || 0) || null,
      heroTitlePt: String(formData.get("heroTitlePt") || ""),
      heroSubtitlePt: String(formData.get("heroSubtitlePt") || ""),
      heroImageUrl: String(formData.get("heroImageUrl") || "/brand/fc-hero.jpg"),
      termsHtmlPt: String(formData.get("termsHtmlPt") || ""),
      privacyHtmlPt: String(formData.get("privacyHtmlPt") || ""),
    },
  });

  await prisma.adminAuditLog.create({
    data: {
      actorId: (await auth())!.user!.id,
      action: "SETTINGS_UPDATE",
      entityType: "SiteSettings",
      entityId: "default",
    },
  });

  revalidatePath("/");
  revalidatePath("/pt/admin");
  return { success: "Configurações atualizadas." };
}

export async function upsertPlanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await requireAdmin())) return { error: "Sem permissão." };

  const id = String(formData.get("id") || "");
  const data = {
    code: String(formData.get("code") || ""),
    namePt: String(formData.get("namePt") || ""),
    nameEn: String(formData.get("nameEn") || String(formData.get("namePt") || "")),
    descriptionPt: String(formData.get("descriptionPt") || "") || null,
    descriptionEn: String(formData.get("descriptionEn") || "") || null,
    priceCents: Math.round(Number(formData.get("priceEuros") || 0) * 100),
    monthlyMinutes: Number(formData.get("monthlyMinutes") || 0),
    equivalentHours: Number(formData.get("equivalentHours") || 0) || null,
    active: formData.get("active") === "on",
    sortOrder: Number(formData.get("sortOrder") || 0),
    featuresJson: String(formData.get("featuresJson") || "[]"),
  };

  if (!data.code || !data.namePt || !data.priceCents || !data.monthlyMinutes) {
    return { error: "Preencha código, nome, preço e minutos." };
  }

  if (id) {
    await prisma.plan.update({ where: { id }, data });
  } else {
    await prisma.plan.create({ data });
  }

  revalidatePath("/pt/planos");
  revalidatePath("/pt/admin");
  return { success: "Plano guardado." };
}

export async function upsertExtraPackageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await requireAdmin())) return { error: "Sem permissão." };
  const id = String(formData.get("id") || "");
  const data = {
    code: String(formData.get("code") || ""),
    namePt: String(formData.get("namePt") || ""),
    nameEn: String(formData.get("nameEn") || String(formData.get("namePt") || "")),
    minutes: Number(formData.get("minutes") || 0),
    priceCents: Math.round(Number(formData.get("priceEuros") || 0) * 100),
    active: formData.get("active") === "on",
    sortOrder: Number(formData.get("sortOrder") || 0),
  };
  if (id) await prisma.extraMinutePackage.update({ where: { id }, data });
  else await prisma.extraMinutePackage.create({ data });
  revalidatePath("/pt/admin");
  revalidatePath("/pt/minutos");
  return { success: "Pacote guardado." };
}

export async function upsertDriverAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await requireAdmin())) return { error: "Sem permissão." };

  const email = String(formData.get("email") || "").toLowerCase();
  const name = String(formData.get("name") || "");
  const phone = String(formData.get("phone") || "");
  const password = String(formData.get("password") || "fcpd123");

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name,
        phone,
        role: "DRIVER",
        status: "ACTIVE",
        emailVerified: new Date(),
        passwordHash: await hash(password, 12),
      },
    });
  }

  await prisma.driverProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      phone,
      active: formData.get("active") !== "off",
      photoUrl: String(formData.get("photoUrl") || "") || null,
      bio: String(formData.get("bio") || "") || null,
    },
    update: {
      phone,
      active: formData.get("active") !== "off",
      photoUrl: String(formData.get("photoUrl") || "") || null,
      bio: String(formData.get("bio") || "") || null,
    },
  });

  const profile = await prisma.driverProfile.findUnique({ where: { userId: user.id } });
  if (profile && formData.get("plate")) {
    await prisma.vehicle.create({
      data: {
        driverId: profile.id,
        make: String(formData.get("make") || "Mercedes-Benz"),
        model: String(formData.get("model") || "Classe E"),
        plate: String(formData.get("plate")),
        color: String(formData.get("color") || "Preto") || null,
        seats: Number(formData.get("seats") || 4),
      },
    });
  }

  revalidatePath("/pt/admin");
  return { success: "Motorista guardado." };
}

export async function suspendCustomerAction(userId: string, suspend: boolean): Promise<ActionState> {
  if (!(await requireAdmin())) return { error: "Sem permissão." };
  await prisma.user.update({
    where: { id: userId },
    data: { status: suspend ? "SUSPENDED" : "ACTIVE" },
  });
  revalidatePath("/pt/admin");
  return { success: suspend ? "Cliente suspenso." : "Cliente reativado." };
}

export async function contactFormAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = String(formData.get("name") || "");
  const email = String(formData.get("email") || "");
  const message = String(formData.get("message") || "");
  if (!name || !email || !message) return { error: "Preencha todos os campos." };

  const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  const { sendEmail } = await import("@/lib/notifications");
  await sendEmail({
    to: settings?.supportEmail || "fcprivatedriver@gmail.com",
    subject: `Contacto web — ${name}`,
    html: `<p><strong>${name}</strong> (${email})</p><p>${message}</p>`,
  });
  return { success: "Mensagem enviada. Responderemos em breve." };
}
