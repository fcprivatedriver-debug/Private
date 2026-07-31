export const APP_NAME = "ZELU";
export const DEFAULT_CURRENCY = "EUR";
export const PLATFORM_FEE_PERCENT_DEFAULT = 15;

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
  PENDING: "Pendente",
  WITHDRAWN: "Retirada",
  REJECTED: "Rejeitada",
  ACCEPTED: "Aceite",
  EXPIRED: "Expirada",
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

export function isZeluElite(profile: {
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

/** @deprecated Use isZeluElite */
export const isZrikElite = isZeluElite;
/** @deprecated Use isZeluElite */
export const isHegosElite = isZeluElite;
/** @deprecated Use isZeluElite */
export const isMovioElite = isZeluElite;

export function bookingReference(bookingId: string): string {
  return `ZLU-${bookingId.slice(-8).toUpperCase()}`;
}
