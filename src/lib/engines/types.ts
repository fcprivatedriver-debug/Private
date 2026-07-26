/**
 * Nina V3 — tipos partilhados dos Intelligence Engines.
 * Engines falam com Providers — nunca com APIs externas directamente.
 */

export type ImpactCategory =
  | "shopping"
  | "fuel"
  | "ev"
  | "finance"
  | "organization"
  | "time";

export type EngineId =
  | "shopping"
  | "fuel"
  | "ev"
  | "saving"
  | "finance"
  | "calendar"
  | "reminder"
  | "navigation"
  | "today"
  | "learning";

export type EngineRecommendation = {
  engine: EngineId;
  /** Uma única melhor opção — nunca uma lista crua */
  headline: string;
  /** Justificação obrigatória */
  reason: string;
  reply: string;
  savingsCents?: number;
  timeMinutesSaved?: number;
  deepLink?: string;
  alternativesCount?: number;
  data?: Record<string, unknown>;
};

export type EngineResult = {
  ok: true;
  recommendation: EngineRecommendation;
  /** Se true, o Saving Engine deve registar impacto */
  recordImpact?: boolean;
};

export type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};
