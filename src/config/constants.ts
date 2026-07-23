export const APP_NAME = "Hegos";
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
  PENDING_VERIFICATION: "Em verificação",
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
  REJECTED: "Recusado",
};

export function isHegosElite(profile: {
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

/** @deprecated Use isHegosElite */
export const isMovioElite = isHegosElite;

export function bookingReference(bookingId: string): string {
  return `HEG-${bookingId.slice(-8).toUpperCase()}`;
}
