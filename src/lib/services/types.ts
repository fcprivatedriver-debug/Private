/**
 * Camada de serviços Nina V2 — coordenação, não substituição.
 * Cada módulo é trocável sem mudar a UI nem a lógica de conversa.
 */

export type ServiceHealth = "ready" | "needs_auth" | "unavailable" | "prototype";

export type ServiceMeta = {
  id: string;
  label: string;
  health: ServiceHealth;
  /** O que o utilizador autoriza (ex.: Google Calendar) */
  external?: string;
};
