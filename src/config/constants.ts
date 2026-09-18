/**
 * Tripvo — public brand & marketplace defaults.
 * Keep technical identifiers (Prisma models, route segments) stable.
 */

export const APP_NAME = "Tripvo";
export const APP_DOMAIN = "tripvo.pt";
export const APP_URL = "https://tripvo.pt";
export const SUPPORT_EMAIL = "suporte@tripvo.pt";

export const DEFAULT_CURRENCY = "EUR";

/**
 * Canonical default marketplace commission (%).
 * All fee resolution should fall back to this constant.
 */
export const PLATFORM_COMMISSION_PERCENT = 5;

/** @deprecated Prefer PLATFORM_COMMISSION_PERCENT */
export const PLATFORM_FEE_PERCENT_DEFAULT = PLATFORM_COMMISSION_PERCENT;

export const TRIP_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  OPEN: "À procura de motoristas",
  OFFER_ACCEPTED: "Motorista escolhido",
  CONFIRMED: "Pagamento confirmado",
  DRIVER_EN_ROUTE: "Motorista a caminho",
  DRIVER_ARRIVED: "Motorista chegou",
  IN_PROGRESS: "Viagem em curso",
  COMPLETED: "Viagem concluída",
  CANCELLED: "Cancelado",
  EXPIRED: "Expirado",
};

/** Customer-facing journey steps (ordered). */
export const JOURNEY_STEPS = [
  { key: "SEARCHING", label: "À procura de motoristas", match: ["OPEN", "DRAFT"] },
  { key: "OFFERS", label: "Propostas recebidas", match: ["OPEN"] },
  { key: "SELECTED", label: "Motorista escolhido", match: ["OFFER_ACCEPTED"] },
  { key: "PAID", label: "Pagamento confirmado", match: ["CONFIRMED", "DRIVER_EN_ROUTE", "DRIVER_ARRIVED", "IN_PROGRESS", "COMPLETED"] },
  { key: "EN_ROUTE", label: "Motorista a caminho", match: ["DRIVER_EN_ROUTE", "DRIVER_ARRIVED", "IN_PROGRESS", "COMPLETED"] },
  { key: "ARRIVED", label: "Motorista chegou", match: ["DRIVER_ARRIVED", "IN_PROGRESS", "COMPLETED"] },
  { key: "IN_PROGRESS", label: "Viagem em curso", match: ["IN_PROGRESS", "COMPLETED"] },
  { key: "DONE", label: "Viagem concluída", match: ["COMPLETED"] },
] as const;

export const OFFER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Enviada",
  WITHDRAWN: "Retirada",
  REJECTED: "Recusada",
  ACCEPTED: "Aceite",
  EXPIRED: "Expirada",
};

export const DRIVER_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  IDENTITY: "Documento de identidade",
  DRIVING_LICENSE: "Carta de condução",
  VEHICLE_REGISTRATION: "Documento do veículo",
  INSURANCE: "Seguro",
  PROFILE_PHOTO: "Fotografia de perfil",
  TVDE_CERTIFICATE: "Certificado TVDE",
  CMTVDE_LICENSE: "Licença CMTVDE",
  CRIMINAL_RECORD: "Registo criminal",
  OTHER: "Outro documento",
};

export const DRIVER_DOCUMENT_STATUS_LABELS: Record<string, string> = {
  MISSING: "Em falta",
  UPLOADED: "Enviado",
  AI_PROCESSING: "Em análise",
  AI_PASSED: "Análise IA positiva",
  AI_FLAGGED: "Sinalizado pela IA",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  EXPIRED: "Expirado",
};

export const DRIVER_STATUS_LABELS: Record<string, string> = {
  PENDING_VERIFICATION: "Em validação",
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
  REJECTED: "Rejeitado",
};

/** Public lifecycle labels for driver onboarding. */
export const DRIVER_LIFECYCLE_LABELS: Record<string, string> = {
  REGISTERED: "Registado",
  DOCS_PENDING: "Documentos pendentes",
  UNDER_REVIEW: "Em validação",
  APPROVED: "Aprovado",
  ACTIVE: "Ativo",
  REJECTED: "Rejeitado",
};

export function driverLifecycleLabel(input: {
  status: string;
  onboardingStatus: string;
  completenessScore?: number;
}): string {
  if (input.status === "ACTIVE" || input.onboardingStatus === "APPROVED") {
    return input.status === "ACTIVE"
      ? DRIVER_LIFECYCLE_LABELS.ACTIVE
      : DRIVER_LIFECYCLE_LABELS.APPROVED;
  }
  if (input.status === "REJECTED" || input.onboardingStatus === "REJECTED") {
    return DRIVER_LIFECYCLE_LABELS.REJECTED;
  }
  if (
    input.onboardingStatus === "SUBMITTED" ||
    input.onboardingStatus === "UNDER_REVIEW"
  ) {
    return DRIVER_LIFECYCLE_LABELS.UNDER_REVIEW;
  }
  if (
    input.onboardingStatus === "IN_PROGRESS" ||
    input.onboardingStatus === "NEEDS_INFO" ||
    (input.completenessScore ?? 0) > 0
  ) {
    return DRIVER_LIFECYCLE_LABELS.DOCS_PENDING;
  }
  return DRIVER_LIFECYCLE_LABELS.REGISTERED;
}

export const REQUIRED_VEHICLE_PHOTO_KEYS = [
  "front",
  "rear",
  "left",
  "right",
  "interiorFront",
  "interiorRear",
  "trunk",
] as const;

export const VEHICLE_PHOTO_LABELS: Record<string, string> = {
  front: "Frente",
  rear: "Traseira",
  left: "Lado esquerdo",
  right: "Lado direito",
  interiorFront: "Interior frente",
  interiorRear: "Interior traseiro",
  trunk: "Bagageira aberta",
  video: "Vídeo curto (opcional)",
};

export function isTripvoElite(profile: {
  ratingAvg?: number | null;
  completedTripsCount?: number | null;
  ratingCount?: number | null;
}): boolean {
  return (
    (profile.ratingAvg ?? 0) >= 4.8 &&
    (profile.completedTripsCount ?? 0) >= 40 &&
    (profile.ratingCount ?? 0) >= 10
  );
}

/** @deprecated Use isTripvoElite */
export const isZeluElite = isTripvoElite;
/** @deprecated Use isTripvoElite */
export const isZrikElite = isTripvoElite;
/** @deprecated Use isTripvoElite */
export const isHegosElite = isTripvoElite;
/** @deprecated Use isTripvoElite */
export const isMovioElite = isTripvoElite;

export function bookingReference(bookingId: string): string {
  return `TRP-${bookingId.slice(-8).toUpperCase()}`;
}
