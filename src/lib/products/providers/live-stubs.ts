/**
 * Providers de supermercado — sem scraping frágil nem catálogo como “preço actual”.
 * Activar só com fonte autorizada via env (não contratar automaticamente).
 */

import type { ProductMatch, StoreProductProvider } from "../types";

async function emptySearch(query: string): Promise<ProductMatch[]> {
  void query;
  return [];
}

function makeStub(id: StoreProductProvider["id"], label: string, envFlag: string): StoreProductProvider {
  return {
    id,
    label,
    async search(query: string) {
      if (process.env[envFlag] === "true") {
        console.warn(`[products] ${label}: ${envFlag} sem implementação autorizada activa`);
      }
      return emptySearch(query);
    },
    async quote(productName: string) {
      const hits = await this.search(productName);
      return hits.find((h) => h.priceCents != null) ?? null;
    },
  };
}

export const continenteProvider = makeStub("continente", "Continente", "CONTINENTE_PRICES_ENABLED");
export const pingoDoceProvider = makeStub("pingo_doce", "Pingo Doce", "PINGO_DOCE_PRICES_ENABLED");
export const auchanProvider = makeStub("auchan", "Auchan", "AUCHAN_PRICES_ENABLED");
