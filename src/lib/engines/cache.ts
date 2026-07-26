/**
 * Cache em memória — reduz custos e chamadas repetidas aos providers.
 * TTL curto; engines reutilizam resultados quando a chave coincide.
 */

import type { CacheEntry } from "./types";

const store = new Map<string, CacheEntry<unknown>>();

export function cacheGet<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return null;
  }
  return hit.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs = 60_000): T {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export function cacheKey(parts: (string | number | undefined | null)[]): string {
  return parts.map((p) => (p == null ? "_" : String(p))).join("|");
}

/** Limpa entradas expiradas (opcional, chamado em rotas quentes). */
export function cacheSweep(): void {
  const now = Date.now();
  for (const [k, v] of store) {
    if (now > v.expiresAt) store.delete(k);
  }
}
