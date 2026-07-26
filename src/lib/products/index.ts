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
import { searchCatalog } from "./catalog";

const PROVIDERS: StoreProductProvider[] = [
  continenteProvider,
  pingoDoceProvider,
  // Futuro: lidlProvider, aldiProvider
];

export function getProductProviders(): StoreProductProvider[] {
  return PROVIDERS;
}

export function getProvider(id: StoreProviderId): StoreProductProvider | null {
  return PROVIDERS.find((p) => p.id === id) ?? null;
}

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

/**
 * Pesquisa em todos os providers activos + catálogo.
 * Se um match claro → exact; se vários → choices; senão none.
 */
export async function searchProducts(query: string): Promise<ProductSearchResult> {
  const q = query.trim();
  if (!q) return { status: "none", query: q };

  const settled = await Promise.all(
    PROVIDERS.map(async (p) => {
      try {
        return await p.search(q);
      } catch {
        return [] as ProductMatch[];
      }
    }),
  );

  let products = dedupe(settled.flat());
  if (products.length === 0) {
    products = searchCatalog(q);
  }

  products.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  if (products.length === 0) return { status: "none", query: q };

  const top = products[0];
  const close = products.filter((p) => (p.score ?? 0) >= (top.score ?? 0) * 0.85);

  // Marca específica (ex. Milhafre) → auto se um claro vencedor
  if (close.length === 1 || (top.score ?? 0) >= 0.9) {
    return { status: "exact", product: top };
  }

  // Mesmo produto em lojas diferentes com score alto → escolhe o mais barato
  const sameName = close.filter(
    (p) => p.name.split(" ").slice(0, 2).join(" ").toLowerCase() ===
      top.name.split(" ").slice(0, 2).join(" ").toLowerCase(),
  );
  if (sameName.length > 1 && (top.brand || q.split(" ").length >= 2)) {
    const cheapest = [...sameName].sort(
      (a, b) => (a.priceCents ?? 99999) - (b.priceCents ?? 99999),
    )[0];
    return { status: "exact", product: cheapest };
  }

  if (close.length > 1) {
    return { status: "choices", products: close.slice(0, 5), query: q };
  }

  return { status: "exact", product: top };
}

/** Compara o custo estimado da lista entre supermercados. */
export async function compareBasket(
  itemNames: string[],
): Promise<BasketCompareResult> {
  const quotes: StorePriceQuote[] = [];

  for (const provider of PROVIDERS) {
    const lines: StorePriceQuote["lines"] = [];
    const missing: string[] = [];
    let totalCents = 0;

    for (const name of itemNames) {
      const match = (await provider.quote?.(name)) ?? (await provider.search(name))[0] ?? null;
      if (match?.priceCents != null) {
        totalCents += match.priceCents;
        lines.push({ name, priceCents: match.priceCents, found: true });
      } else {
        missing.push(name);
        lines.push({ name, priceCents: null, found: false });
      }
    }

    quotes.push({
      storeId: provider.id,
      storeName: provider.label,
      totalCents,
      missing,
      lines,
    });
  }

  const usable = quotes.filter((q) => q.lines.some((l) => l.found));
  usable.sort((a, b) => a.totalCents - b.totalCents);
  const best = usable[0] ?? null;
  const second = usable[1];
  const savingsCents =
    best && second ? Math.max(0, second.totalCents - best.totalCents) : 0;

  return { quotes, best, savingsCents };
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
