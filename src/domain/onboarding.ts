import { prisma } from "@/lib/db";
import { DomainError } from "@/domain/marketplace";
import { getAiVerificationProvider } from "@/lib/ai";
import { deleteStoredFile, storeDriverFile } from "@/lib/storage";
import type {
  DriverDocumentType,
  OnboardingStatus,
  VerificationDecision,
} from "@prisma/client";

const REQUIRED_DOC_TYPES: DriverDocumentType[] = [
  "IDENTITY",
  "DRIVING_LICENSE",
  "INSURANCE",
  "VEHICLE_REGISTRATION",
];

const STEPS = ["profile", "vehicle", "documents", "review"] as const;
export type OnboardingStep = (typeof STEPS)[number];

function parseLanguages(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // legacy comma-separated
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function getDriverOnboarding(userId: string) {
  const profile = await prisma.driverProfile.findUnique({
    where: { userId },
    include: {
      vehicles: { include: { vehicleClass: true } },
      verificationDocs: { orderBy: { createdAt: "desc" } },
      verificationReviews: { orderBy: { createdAt: "desc" }, take: 10 },
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  });
  if (!profile) throw new DomainError("NOT_FOUND", "Perfil de motorista em falta");
  return profile;
}

export function computeCompleteness(input: {
  bio?: string | null;
  photoUrl?: string | null;
  yearsOfExperience: number;
  languagesSpoken: string;
  hasVehicle: boolean;
  docTypes: string[];
}): number {
  let score = 0;
  if (input.photoUrl) score += 15;
  if (input.bio && input.bio.trim().length >= 40) score += 15;
  else if (input.bio && input.bio.trim().length >= 10) score += 8;
  if (input.yearsOfExperience > 0) score += 10;
  if (parseLanguages(input.languagesSpoken).length > 0) score += 10;
  if (input.hasVehicle) score += 20;
  const present = new Set(input.docTypes);
  const requiredHit = REQUIRED_DOC_TYPES.filter((t) => present.has(t)).length;
  score += Math.round((requiredHit / REQUIRED_DOC_TYPES.length) * 30);
  return Math.min(100, score);
}

export async function refreshCompleteness(driverProfileId: string) {
  const profile = await prisma.driverProfile.findUnique({
    where: { id: driverProfileId },
    include: {
      vehicles: true,
      verificationDocs: true,
    },
  });
  if (!profile) return 0;
  const score = computeCompleteness({
    bio: profile.bio,
    photoUrl: profile.photoUrl,
    yearsOfExperience: profile.yearsOfExperience,
    languagesSpoken: profile.languagesSpoken,
    hasVehicle: profile.vehicles.length > 0,
    docTypes: profile.verificationDocs.map((d) => d.type),
  });
  await prisma.driverProfile.update({
    where: { id: driverProfileId },
    data: { completenessScore: score },
  });
  return score;
}

export async function updateDriverProfileStep(
  userId: string,
  input: {
    bio?: string;
    languagesSpoken?: string[];
    yearsOfExperience?: number;
    photoUrl?: string | null;
    step?: OnboardingStep;
  },
) {
  const profile = await prisma.driverProfile.findUnique({ where: { userId } });
  if (!profile) throw new DomainError("NOT_FOUND", "Perfil em falta");
  if (["APPROVED", "SUBMITTED", "UNDER_REVIEW"].includes(profile.onboardingStatus) && profile.status === "ACTIVE") {
    // allow profile edits but keep status
  }

  const updated = await prisma.driverProfile.update({
    where: { id: profile.id },
    data: {
      bio: input.bio ?? profile.bio,
      languagesSpoken: input.languagesSpoken
        ? JSON.stringify(input.languagesSpoken)
        : profile.languagesSpoken,
      yearsOfExperience: input.yearsOfExperience ?? profile.yearsOfExperience,
      photoUrl: input.photoUrl === undefined ? profile.photoUrl : input.photoUrl,
      onboardingStep: input.step ?? profile.onboardingStep,
      onboardingStatus:
        profile.onboardingStatus === "NOT_STARTED" ? "IN_PROGRESS" : profile.onboardingStatus,
    },
  });
  await refreshCompleteness(profile.id);
  return updated;
}

export async function setOnboardingStep(userId: string, step: OnboardingStep) {
  const profile = await prisma.driverProfile.findUnique({ where: { userId } });
  if (!profile) throw new DomainError("NOT_FOUND", "Perfil em falta");
  return prisma.driverProfile.update({
    where: { id: profile.id },
    data: {
      onboardingStep: step,
      onboardingStatus:
        profile.onboardingStatus === "NOT_STARTED" ? "IN_PROGRESS" : profile.onboardingStatus,
    },
  });
}

export async function uploadDriverDocument(input: {
  userId: string;
  type: DriverDocumentType;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}) {
  const profile = await prisma.driverProfile.findUnique({ where: { userId: input.userId } });
  if (!profile) throw new DomainError("NOT_FOUND", "Perfil em falta");
  if (profile.status === "SUSPENDED") {
    throw new DomainError("FORBIDDEN", "Conta suspensa");
  }
  if (input.bytes.length > 10_000_000) {
    throw new DomainError("VALIDATION", "Ficheiro demasiado grande (máx. 10MB)");
  }
  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowed.includes(input.mimeType)) {
    throw new DomainError("VALIDATION", "Tipo de ficheiro não suportado");
  }

  const stored = await storeDriverFile({
    driverUserId: input.userId,
    fileName: input.fileName,
    mimeType: input.mimeType,
    bytes: input.bytes,
  });

  // Replace previous doc of same type
  const existing = await prisma.driverDocument.findMany({
    where: { driverProfileId: profile.id, type: input.type },
  });
  for (const doc of existing) {
    await deleteStoredFile(doc.storageKey);
    await prisma.driverDocument.delete({ where: { id: doc.id } });
  }

  const doc = await prisma.driverDocument.create({
    data: {
      driverProfileId: profile.id,
      type: input.type,
      status: "UPLOADED",
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: stored.sizeBytes,
      storageKey: stored.storageKey,
      url: stored.url,
    },
  });

  await prisma.driverProfile.update({
    where: { id: profile.id },
    data: {
      onboardingStatus:
        profile.onboardingStatus === "NOT_STARTED" || profile.onboardingStatus === "REJECTED"
          ? "IN_PROGRESS"
          : profile.onboardingStatus === "NEEDS_INFO"
            ? "IN_PROGRESS"
            : profile.onboardingStatus,
      onboardingStep: "documents",
    },
  });

  await refreshCompleteness(profile.id);
  return doc;
}

export async function runAiVerification(driverProfileId: string, actorUserId?: string) {
  const profile = await prisma.driverProfile.findUnique({
    where: { id: driverProfileId },
    include: {
      user: true,
      vehicles: true,
      verificationDocs: true,
    },
  });
  if (!profile) throw new DomainError("NOT_FOUND", "Perfil em falta");

  const result = await getAiVerificationProvider().analyzeDriver({
    name: profile.user.name,
    bio: profile.bio,
    yearsOfExperience: profile.yearsOfExperience,
    languagesSpoken: parseLanguages(profile.languagesSpoken),
    hasPhoto: Boolean(profile.photoUrl),
    hasVehicle: profile.vehicles.length > 0,
    vehicle: profile.vehicles[0]
      ? {
          make: profile.vehicles[0].make,
          model: profile.vehicles[0].model,
          year: profile.vehicles[0].year,
          plate: profile.vehicles[0].plate,
          seats: profile.vehicles[0].seats,
        }
      : null,
    documents: profile.verificationDocs.map((d) => ({
      type: d.type,
      fileName: d.fileName,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
    })),
  });

  for (const doc of profile.verificationDocs) {
    const score = result.documentScores[doc.type];
    if (score == null) continue;
    await prisma.driverDocument.update({
      where: { id: doc.id },
      data: {
        aiScore: score,
        aiAnalysis: JSON.stringify({ provider: result.provider, score }),
        aiFlags: JSON.stringify(
          result.findings.filter((f) => f.message.includes(doc.type)).map((f) => f.code),
        ),
        status: score >= 70 ? "AI_PASSED" : "AI_FLAGGED",
      },
    });
  }

  const decisionMap: Record<string, VerificationDecision> = {
    APPROVE: "APPROVE",
    REJECT: "REJECT",
    REQUEST_INFO: "REQUEST_INFO",
    ESCALATE: "ESCALATE",
  };

  await prisma.verificationReview.create({
    data: {
      driverProfileId: profile.id,
      source: "AI",
      decision: decisionMap[result.recommendation],
      riskScore: result.riskScore,
      confidence: result.confidence,
      recommendation: result.summary,
      findings: JSON.stringify(result.findings),
      actorUserId: actorUserId || null,
    },
  });

  await prisma.driverProfile.update({
    where: { id: profile.id },
    data: {
      aiRiskScore: result.riskScore,
      aiConfidence: result.confidence,
      aiSummary: result.summary,
      onboardingStatus: "UNDER_REVIEW",
      status: "PENDING_VERIFICATION",
    },
  });

  return result;
}

export async function submitOnboarding(userId: string) {
  const profile = await getDriverOnboarding(userId);
  if (profile.status === "SUSPENDED") {
    throw new DomainError("FORBIDDEN", "Conta suspensa");
  }
  if (profile.status === "ACTIVE") {
    throw new DomainError("INVALID_STATE", "Já verificado");
  }

  const score = await refreshCompleteness(profile.id);
  if (score < 70) {
    throw new DomainError(
      "INCOMPLETE",
      `Perfil incompleto (${score}%). Completa perfil, veículo e documentos obrigatórios.`,
    );
  }

  const present = new Set(profile.verificationDocs.map((d) => d.type));
  const missing = REQUIRED_DOC_TYPES.filter((t) => !present.has(t));
  if (missing.length) {
    throw new DomainError("MISSING_DOCS", `Documentos em falta: ${missing.join(", ")}`);
  }
  if (profile.vehicles.length === 0) {
    throw new DomainError("NO_VEHICLE", "Regista um veículo antes de submeter");
  }

  await prisma.driverProfile.update({
    where: { id: profile.id },
    data: {
      onboardingStatus: "SUBMITTED",
      onboardingStep: "review",
      submittedAt: new Date(),
      rejectionReason: null,
      infoRequestMessage: null,
    },
  });

  const ai = await runAiVerification(profile.id, userId);

  await prisma.notification.create({
    data: {
      userId,
      type: "ONBOARDING_SUBMITTED",
      title: "Pedido de verificação enviado",
      body: "A IA da Hegos analisou o teu perfil. A equipa irá confirmar em breve.",
      meta: JSON.stringify({ riskScore: ai.riskScore, recommendation: ai.recommendation }),
    },
  });

  return { score, ai };
}

export async function adminDecideVerification(input: {
  driverProfileId: string;
  adminUserId: string;
  decision: "APPROVE" | "REJECT" | "REQUEST_INFO";
  notes?: string;
}) {
  const profile = await prisma.driverProfile.findUnique({
    where: { id: input.driverProfileId },
    include: { user: true, verificationDocs: true },
  });
  if (!profile) throw new DomainError("NOT_FOUND", "Perfil em falta");

  if (input.decision === "APPROVE") {
    await prisma.$transaction(async (tx) => {
      await tx.driverProfile.update({
        where: { id: profile.id },
        data: {
          status: "ACTIVE",
          onboardingStatus: "APPROVED",
          onboardingStep: "done",
          verifiedAt: new Date(),
          rejectionReason: null,
          infoRequestMessage: null,
          adminNotes: input.notes || null,
        },
      });
      await tx.driverDocument.updateMany({
        where: { driverProfileId: profile.id },
        data: { status: "APPROVED", reviewedAt: new Date() },
      });
      await tx.verificationReview.create({
        data: {
          driverProfileId: profile.id,
          source: "ADMIN",
          decision: "APPROVE",
          riskScore: profile.aiRiskScore,
          confidence: profile.aiConfidence,
          recommendation: "Admin approved",
          notes: input.notes || null,
          actorUserId: input.adminUserId,
          findings: "[]",
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: input.adminUserId,
          action: "DRIVER_APPROVE",
          entityType: "DriverProfile",
          entityId: profile.id,
          meta: JSON.stringify({ notes: input.notes || null }),
        },
      });
      await tx.notification.create({
        data: {
          userId: profile.userId,
          type: "DRIVER_APPROVED",
          title: "Conta verificada",
          body: "Parabéns! O teu perfil Hegos foi aprovado. Já podes enviar propostas.",
        },
      });
    });
    return { status: "ACTIVE" as const };
  }

  if (input.decision === "REJECT") {
    await prisma.$transaction(async (tx) => {
      await tx.driverProfile.update({
        where: { id: profile.id },
        data: {
          status: "REJECTED",
          onboardingStatus: "REJECTED",
          verifiedAt: null,
          rejectionReason: input.notes || "Documentação insuficiente",
          adminNotes: input.notes || null,
        },
      });
      await tx.verificationReview.create({
        data: {
          driverProfileId: profile.id,
          source: "ADMIN",
          decision: "REJECT",
          riskScore: profile.aiRiskScore,
          confidence: profile.aiConfidence,
          recommendation: "Admin rejected",
          notes: input.notes || null,
          actorUserId: input.adminUserId,
          findings: "[]",
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: input.adminUserId,
          action: "DRIVER_REJECT",
          entityType: "DriverProfile",
          entityId: profile.id,
          meta: JSON.stringify({ notes: input.notes || null }),
        },
      });
      await tx.notification.create({
        data: {
          userId: profile.userId,
          type: "DRIVER_REJECTED",
          title: "Verificação recusada",
          body: input.notes || "O pedido de verificação foi recusado.",
        },
      });
    });
    return { status: "REJECTED" as const };
  }

  // REQUEST_INFO
  await prisma.$transaction(async (tx) => {
    await tx.driverProfile.update({
      where: { id: profile.id },
      data: {
        status: "PENDING_VERIFICATION",
        onboardingStatus: "NEEDS_INFO",
        onboardingStep: "documents",
        infoRequestMessage: input.notes || "Precisamos de documentos adicionais ou mais nítidos.",
        adminNotes: input.notes || null,
      },
    });
    await tx.verificationReview.create({
      data: {
        driverProfileId: profile.id,
        source: "ADMIN",
        decision: "REQUEST_INFO",
        riskScore: profile.aiRiskScore,
        confidence: profile.aiConfidence,
        recommendation: "Admin requested more info",
        notes: input.notes || null,
        actorUserId: input.adminUserId,
        findings: "[]",
      },
    });
    await tx.notification.create({
      data: {
        userId: profile.userId,
        type: "DRIVER_NEEDS_INFO",
        title: "Informação adicional necessária",
        body: input.notes || "Atualiza os teus documentos e volta a submeter.",
      },
    });
  });
  return { status: "NEEDS_INFO" as OnboardingStatus };
}

export async function listVerificationQueue() {
  return prisma.driverProfile.findMany({
    where: {
      OR: [
        { onboardingStatus: { in: ["SUBMITTED", "UNDER_REVIEW", "NEEDS_INFO"] } },
        { status: "PENDING_VERIFICATION", completenessScore: { gte: 50 } },
      ],
    },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      vehicles: { include: { vehicleClass: true } },
      verificationDocs: true,
      verificationReviews: { orderBy: { createdAt: "desc" }, take: 3 },
    },
    orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
  });
}

export { REQUIRED_DOC_TYPES, STEPS, parseLanguages };
