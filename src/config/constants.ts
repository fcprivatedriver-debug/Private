import type {
  PaymentStatus,
  SubscriptionStatus,
  TripStatus,
  PaymentMethodType,
} from "@prisma/client";

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "FC Private Driver";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
export const DEFAULT_LOCALE = "pt" as const;
export const LOCALES = ["pt", "en"] as const;
export type AppLocale = (typeof LOCALES)[number];

export const LOW_BALANCE_THRESHOLD_DEFAULT = 60;
export const TOLERANCE_MINUTES_DEFAULT = 10;
export const MINIMUM_CHARGE_MINUTES_DEFAULT = 15;

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  AWAITING_CONFIRMATION: "A aguardar confirmação",
  CONFIRMED: "Confirmada",
  DRIVER_ASSIGNED: "Motorista atribuído",
  DRIVER_EN_ROUTE: "Motorista a caminho",
  DRIVER_ARRIVED: "Motorista chegou",
  IN_PROGRESS: "Em viagem",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
  NO_SHOW: "Não compareceu",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  PENDING_PAYMENT: "Pagamento pendente",
  ACTIVE: "Ativo",
  PAST_DUE: "Em atraso",
  SUSPENDED: "Suspenso",
  CANCELLED: "Cancelado",
  EXPIRED: "Expirado",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  FAILED: "Falhado",
  EXPIRED: "Expirado",
  REFUNDED: "Reembolsado",
  PARTIALLY_REFUNDED: "Parcialmente reembolsado",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
  CARD: "Cartão",
  MB_WAY: "MB WAY",
  MULTIBANCO: "Multibanco",
  MANUAL: "Manual",
  OTHER: "Outro",
};

export const WEEKDAY_LABELS = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
] as const;
