/**
 * TTL / frescura por tipo de dado externo.
 * Dados estáticos ≠ dinâmicos — não re-sincronizar localização a cada minuto.
 */

import type { ExternalDataSource } from "@prisma/client";

/** ms */
export const TTL = {
  /** Preços combustível — voláteis; alvo 4–6h se Partilha autorizar. */
  FUEL_PRICE_MS: 6 * 60 * 60 * 1000,
  /** Após isto, marcar stale (ainda mostrar com timestamp). */
  FUEL_STALE_MS: 24 * 60 * 60 * 1000,
  /** Estações EV estáticas (Lisboa CC0) — diário basta. */
  EV_STATIC_MS: 24 * 60 * 60 * 1000,
  EV_STATIC_STALE_MS: 7 * 24 * 60 * 60 * 1000,
  /** Disponibilidade/tarifa EV — quando existirem fontes dinâmicas. */
  EV_DYNAMIC_MS: 15 * 60 * 1000,
  EV_DYNAMIC_STALE_MS: 2 * 60 * 60 * 1000,
  /** Preços supermercado — 1×/dia. */
  PRODUCT_PRICE_MS: 24 * 60 * 60 * 1000,
  PRODUCT_STALE_MS: 48 * 60 * 60 * 1000,
} as const;

export const SYNC_SCHEDULE = {
  /** Cron Vercel diário (Hobby). Admin pode forçar mais vezes. */
  DGEG_FUEL: "30 4 * * *",
  MOBIE_LISBOA: "30 4 * * *",
  PRODUCTS: "manual",
} as const;

export function isStale(fetchedAt: Date | null | undefined, staleMs: number, now = new Date()): boolean {
  if (!fetchedAt) return true;
  return now.getTime() - fetchedAt.getTime() > staleMs;
}

export function sourceTtl(source: ExternalDataSource): { refreshMs: number; staleMs: number } {
  switch (source) {
    case "DGEG_FUEL":
    case "DADOS_GOV_FUEL_LOCATIONS":
      return { refreshMs: TTL.FUEL_PRICE_MS, staleMs: TTL.FUEL_STALE_MS };
    case "MOBIE_LISBOA":
      return { refreshMs: TTL.EV_STATIC_MS, staleMs: TTL.EV_STATIC_STALE_MS };
    case "MOBIE_DATEX":
      return { refreshMs: TTL.EV_DYNAMIC_MS, staleMs: TTL.EV_DYNAMIC_STALE_MS };
    case "CONTINENTE":
    case "PINGO_DOCE":
    case "AUCHAN":
    case "MANUAL_IMPORT":
      return { refreshMs: TTL.PRODUCT_PRICE_MS, staleMs: TTL.PRODUCT_STALE_MS };
    default:
      return { refreshMs: TTL.PRODUCT_PRICE_MS, staleMs: TTL.PRODUCT_STALE_MS };
  }
}
