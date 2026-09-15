import type { ProductMatch, StoreProductProvider } from "../types";
import { searchCatalog } from "../catalog";

/**
 * Continente Provider (V1).
 * Tenta o site; se falhar ou vier sem preços úteis, usa catálogo de referência.
 * Substituível por API oficial sem mudar a Nina.
 */
async function tryFetchContinente(query: string): Promise<ProductMatch[]> {
  try {
    const url = `https://www.continente.pt/pesquisa/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; NinaProductBot/1.0; +https://ninapp.pt)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const matches: ProductMatch[] = [];
    const priceRe = /(\d+)[,.](\d{2})\s*€/g;
    const titleHints = html.match(/product-name[^>]*>([^<]+)</gi) || [];
    for (let i = 0; i < Math.min(titleHints.length, 5); i++) {
      const name = titleHints[i].replace(/.*>([^<]+)<.*/, "$1").trim();
      if (!name || name.length < 3) continue;
      const priceM = priceRe.exec(html);
      const priceCents = priceM
        ? Number(priceM[1]) * 100 + Number(priceM[2])
        : null;
      matches.push({
        id: `cont-live-${i}-${Buffer.from(name).toString("base64url").slice(0, 12)}`,
        name,
        brand: null,
        weight: null,
        categorySlug: null,
        priceCents,
        imageUrl: null,
        storeName: "Continente",
        storeId: "continente",
        productUrl: url,
        score: 0.55,
      });
    }
    return matches;
  } catch {
    return [];
  }
}

function mergePreferPriced(live: ProductMatch[], catalog: ProductMatch[]): ProductMatch[] {
  const liveUseful = live.filter((p) => p.priceCents != null && p.priceCents > 0);
  if (liveUseful.length > 0) return liveUseful;
  return catalog;
}

export const continenteProvider: StoreProductProvider = {
  id: "continente",
  label: "Continente",
  async search(query: string) {
    const [live, catalog] = await Promise.all([
      tryFetchContinente(query),
      Promise.resolve(searchCatalog(query, "continente")),
    ]);
    return mergePreferPriced(live, catalog);
  },
  async quote(productName: string) {
    const hits = await this.search(productName);
    return hits.find((h) => h.priceCents != null) ?? hits[0] ?? null;
  },
};
