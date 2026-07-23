export const APP_NAME = "Movio";
export const DEFAULT_CURRENCY = "EUR";
export const PLATFORM_FEE_PERCENT_DEFAULT = 15;

export const TRIP_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  OPEN: "Aberto a propostas",
  OFFER_ACCEPTED: "Proposta aceite",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em curso",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  EXPIRED: "Expirado",
};

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
