"use server";

import { auth } from "@/lib/auth";
import {
  adminDecideVerification,
  runAiVerification,
  setOnboardingStep,
  submitOnboarding,
  updateDriverProfileStep,
  uploadDriverDocument,
  type OnboardingStep,
} from "@/domain/onboarding";
import type { DriverDocumentType } from "@prisma/client";
import { toActionFailure } from "@/lib/action-errors";
import { prisma } from "@/lib/db";

function fail(error: unknown) {
  return toActionFailure(error);
}

async function requireDriverUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Inicie sessão para continuar.", code: "UNAUTHORIZED" };
  }
  const profile = await prisma.driverProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile && session.user.role !== "DRIVER") {
    return {
      ok: false as const,
      error: "Ative o perfil de motorista nesta conta para continuar.",
      code: "NO_DRIVER",
    };
  }
  return { ok: true as const, session };
}

export async function saveOnboardingProfileAction(formData: FormData) {
  const gate = await requireDriverUser();
  if (!gate.ok) return gate;
  try {
    const name = String(formData.get("name") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    if (name) {
      await prisma.user.update({
        where: { id: gate.session.user.id },
        data: {
          name,
          phone: phone || null,
        },
      });
    }
    const languages = String(formData.get("languagesSpoken") || "pt")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    await updateDriverProfileStep(gate.session.user.id, {
      bio: String(formData.get("bio") || ""),
      yearsOfExperience: Number(formData.get("yearsOfExperience") || 0),
      languagesSpoken: languages,
      photoUrl: String(formData.get("photoUrl") || "") || null,
      step: "profile",
    });
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function setOnboardingStepAction(step: OnboardingStep) {
  const gate = await requireDriverUser();
  if (!gate.ok) return gate;
  try {
    await setOnboardingStep(gate.session.user.id, step);
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function uploadDocumentAction(formData: FormData) {
  const gate = await requireDriverUser();
  if (!gate.ok) return gate;
  try {
    const file = formData.get("file");
    const type = String(formData.get("type") || "") as DriverDocumentType;
    const photoKey = String(formData.get("photoKey") || "");
    if (!(file instanceof File)) return { ok: false as const, error: "Ficheiro em falta" };
    const bytes = Buffer.from(await file.arrayBuffer());

    // Vehicle photos: store as file and attach URL onto vehicle.photoUrls
    if (photoKey) {
      const mime = file.type || "application/octet-stream";
      const allowedPhoto = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "video/mp4",
        "video/quicktime",
        "video/webm",
      ];
      if (!allowedPhoto.includes(mime)) {
        return {
          ok: false as const,
          error: "Formato não suportado. Use imagem (JPG/PNG/WebP) ou vídeo curto (MP4/WebM).",
        };
      }
      if (bytes.length > 25_000_000) {
        return { ok: false as const, error: "Ficheiro demasiado grande (máx. 25MB para fotos/vídeo)." };
      }
      const { storeDriverFile } = await import("@/lib/storage");
      const stored = await storeDriverFile({
        driverUserId: gate.session.user.id,
        fileName: `${photoKey}-${file.name}`,
        mimeType: mime,
        bytes,
      });
      const profile = await prisma.driverProfile.findUnique({
        where: { userId: gate.session.user.id },
        include: { vehicles: true },
      });
      if (!profile?.vehicles[0]) {
        return {
          ok: false as const,
          error: "Guarde primeiro os dados do veículo.",
          code: "NO_VEHICLE",
        };
      }
      let photos: Record<string, string> = {};
      try {
        photos = JSON.parse(profile.vehicles[0].photoUrls || "{}");
        if (Array.isArray(photos)) photos = {};
      } catch {
        photos = {};
      }
      photos[photoKey] = stored.url;
      await prisma.vehicle.update({
        where: { id: profile.vehicles[0].id },
        data: { photoUrls: JSON.stringify(photos) },
      });
      const { refreshCompleteness } = await import("@/domain/onboarding");
      await refreshCompleteness(profile.id);
      return { ok: true as const, url: stored.url, photoKey };
    }

    const doc = await uploadDriverDocument({
      userId: gate.session.user.id,
      type,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      bytes,
    });
    return { ok: true as const, documentId: doc.id, url: doc.url };
  } catch (error) {
    return fail(error);
  }
}

export async function submitOnboardingAction() {
  const gate = await requireDriverUser();
  if (!gate.ok) return gate;
  try {
    const result = await submitOnboarding(gate.session.user.id);
    return {
      ok: true as const,
      score: result.score,
      recommendation: result.ai.recommendation,
      riskScore: result.ai.riskScore,
      verdict: result.ai.verdict,
      autoApprove: result.ai.autoApprove,
    };
  } catch (error) {
    return fail(error);
  }
}

export async function adminVerificationAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { ok: false as const, error: "Sem permissão de administrador." };
  }
  try {
    const decision = String(formData.get("decision") || "") as
      | "APPROVE"
      | "REJECT"
      | "REQUEST_INFO";
    if (!["APPROVE", "REJECT", "REQUEST_INFO"].includes(decision)) {
      return { ok: false as const, error: "Decisão inválida." };
    }
    const notes = String(formData.get("notes") || "");
    if (decision === "REJECT" && !notes.trim()) {
      return {
        ok: false as const,
        error: "Indique o motivo da rejeição.",
        code: "NOTES_REQUIRED",
      };
    }
    await adminDecideVerification({
      driverProfileId: String(formData.get("driverProfileId")),
      adminUserId: session.user.id,
      decision,
      notes,
    });
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function rerunAiVerificationAction(driverProfileId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { ok: false as const, error: "Sem permissão de administrador." };
  }
  try {
    const result = await runAiVerification(driverProfileId, session.user.id);
    return { ok: true as const, verdict: result.verdict, autoApprove: result.autoApprove };
  } catch (error) {
    return fail(error);
  }
}
