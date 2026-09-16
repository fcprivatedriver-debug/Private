/**
 * Product Service — camada entre a MEL e os supermercados.
 * Sem catálogo hardcoded apresentado como preços actuais.
 *
 * Continente / Pingo Doce / Auchan: sem API pública oficial autorizada.
 * Providers devolvem vazio até existir fonte licenciada (env + implementação).
 */

import type {
  BasketCompareResult,
  ProductMatch,
  ProductSearchResult,
  StorePriceQuote,
  StoreProductProvider,
  StoreProviderId,
} from "./types";
import { continenteProvider } from "./providers/continente";
import { pingoDoceProvider } from "./providers/pingo-doce";
import { auchanProvider } from "./providers/auchan";

const PROVIDERS: StoreProductProvider[] = [
  continenteProvider,
  pingoDoceProvider,
  auchanProvider,
];

export function getProductProviders(): StoreProductProvider[] {
  return PROVIDERS;
}

export function getProvider(id: StoreProviderId): StoreProductProvider | null {
  return PROVIDERS.find((p) => p.id === id) ?? null;
}

export const PRODUCTS_UNAVAILABLE_REASON =
  "Preços de supermercado indisponíveis. Ainda não há fonte autorizada configurada (Continente, Pingo Doce, Auchan).";

function dedupe(products: ProductMatch[]): ProductMatch[] {
  const seen = new Set<string>();
  const out: ProductMatch[] = [];
  for (const p of products) {
    const key = `${p.storeId}:${p.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

export async function searchProducts(query: string): Promise<ProductSearchResult> {
  const q = query.trim();
  if (!q) return { status: "none", query: q };

  const lists = await Promise.all(PROVIDERS.map((p) => p.search(q)));
  const products = dedupe(lists.flat()).filter((p) => p.priceCents != null && p.priceCents > 0);

  if (products.length === 0) {
    return { status: "none", query: q };
  }
  if (products.length === 1) {
    return { status: "exact", product: products[0] };
  }
  return { status: "choices", products: products.slice(0, 8), query: q };
}

/**
 * Compara um cesto. Só devolve totais quando há preços reais.
 * Sem dados: quotes com missing=todos e best=null.
 */
export async function compareBasket(itemNames: string[]): Promise<BasketCompareResult> {
  const names = itemNames.map((n) => n.trim()).filter(Boolean);
  const quotes: StorePriceQuote[] = [];

  for (const provider of PROVIDERS) {
    const lines: StorePriceQuote["lines"] = [];
    let totalCents = 0;
    const missing: string[] = [];

    for (const name of names) {
      const hit = provider.quote ? await provider.quote(name) : (await provider.search(name))[0];
      if (hit?.priceCents != null && hit.priceCents > 0) {
        lines.push({ name, priceCents: hit.priceCents, found: true });
        totalCents += hit.priceCents;
      } else {
        lines.push({ name, priceCents: null, found: false });
        missing.push(name);
      }
    }

    quotes.push({
      storeId: provider.id,
      storeName: provider.label,
      totalCents,
      missing,
      lines,
      updatedAt: null,
      source: "unavailable",
      complete: missing.length === 0 && names.length > 0,
    });
  }

  const complete = quotes.filter((q) => q.complete && q.totalCents > 0);
  complete.sort((a, b) => a.totalCents - b.totalCents);
  const best = complete[0] ?? null;
  const second = complete[1];
  const savingsCents =
    best && second ? Math.max(0, second.totalCents - best.totalCents) : 0;

  return { quotes, best, savingsCents, unavailableReason: complete.length === 0 ? PRODUCTS_UNAVAILABLE_REASON : undefined };
}

export function categoryKeyFromQuery(query: string): string {
  const n = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (/manteiga/.test(n)) return "manteiga";
  if (/leite/.test(n)) return "leite";
  if (/cafe|café/.test(n)) return "cafe";
  if (/banana/.test(n)) return "banana";
  if (/pao|pão/.test(n)) return "pao";
  if (/ovo/.test(n)) return "ovos";
  const tokens = n.replace(/[^a-z0-9\s]/g, " ").trim().split(/\s+/);
  return tokens[0] || "geral";
}

export type { ProductMatch, ProductSearchResult, BasketCompareResult };
