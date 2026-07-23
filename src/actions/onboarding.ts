"use server";

import { auth } from "@/lib/auth";
import { DomainError } from "@/domain/marketplace";
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

function fail(error: unknown) {
  if (error instanceof DomainError) {
    return { ok: false as const, error: error.message, code: error.code };
  }
  console.error(error);
  return { ok: false as const, error: "Unexpected error", code: "INTERNAL" };
}

export async function saveOnboardingProfileAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") {
    return { ok: false as const, error: "Sem permissão" };
  }
  try {
    const languages = String(formData.get("languagesSpoken") || "pt")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    await updateDriverProfileStep(session.user.id, {
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
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") {
    return { ok: false as const, error: "Sem permissão" };
  }
  try {
    await setOnboardingStep(session.user.id, step);
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function uploadDocumentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") {
    return { ok: false as const, error: "Sem permissão" };
  }
  try {
    const file = formData.get("file");
    const type = String(formData.get("type") || "") as DriverDocumentType;
    if (!(file instanceof File)) return { ok: false as const, error: "Ficheiro em falta" };
    const bytes = Buffer.from(await file.arrayBuffer());
    const doc = await uploadDriverDocument({
      userId: session.user.id,
      type,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      bytes,
    });
    return { ok: true as const, documentId: doc.id };
  } catch (error) {
    return fail(error);
  }
}

export async function submitOnboardingAction() {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") {
    return { ok: false as const, error: "Sem permissão" };
  }
  try {
    const result = await submitOnboarding(session.user.id);
    return {
      ok: true as const,
      score: result.score,
      recommendation: result.ai.recommendation,
      riskScore: result.ai.riskScore,
    };
  } catch (error) {
    return fail(error);
  }
}

export async function adminVerificationAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { ok: false as const, error: "Sem permissão" };
  }
  try {
    const decision = String(formData.get("decision") || "") as
      | "APPROVE"
      | "REJECT"
      | "REQUEST_INFO";
    const driverProfileId = String(formData.get("driverProfileId") || "");
    const notes = String(formData.get("notes") || "") || undefined;
    await adminDecideVerification({
      driverProfileId,
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
    return { ok: false as const, error: "Sem permissão" };
  }
  try {
    const ai = await runAiVerification(driverProfileId, session.user.id);
    return { ok: true as const, ai };
  } catch (error) {
    return fail(error);
  }
}
