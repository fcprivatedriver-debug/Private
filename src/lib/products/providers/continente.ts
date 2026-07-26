import type { ProductMatch, StoreProductProvider } from "../types";
import { searchCatalog } from "../catalog";

/**
 * Continente Provider (protótipo).
 * Tenta pesquisa no site; se falhar, usa catálogo isolado.
 * Substituível por API oficial sem mudar a Nina.
 */
async function tryFetchContinente(query: string): Promise<ProductMatch[]> {
  try {
    const url = `https://www.continente.pt/pesquisa/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; NinaProductBot/1.0; +https://nina.app)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    // Extrai blocos simples product/name/price — frágil; é só protótipo.
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
        score: 0.5,
      });
    }
    return matches;
  } catch {
    return [];
  }
}

export const continenteProvider: StoreProductProvider = {
  id: "continente",
  label: "Continente",
  async search(query: string) {
    const live = await tryFetchContinente(query);
    if (live.length > 0) return live;
    return searchCatalog(query, "continente");
  },
  async quote(productName: string) {
    const hits = await this.search(productName);
    return hits[0] ?? null;
  },
};
