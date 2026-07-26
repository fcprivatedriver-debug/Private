import type { ProductMatch, StoreProviderId } from "./types";

/**
 * Catálogo local de protótipo — usado quando o fetch ao site falha
 * ou para acelerar demos. Substituível por APIs oficiais.
 */
type CatalogEntry = Omit<ProductMatch, "score"> & { keywords: string[] };

const CATALOG: CatalogEntry[] = [
  {
    id: "pd-milhafre-sal-250",
    name: "Manteiga Milhafre com Sal 250 g",
    brand: "Milhafre",
    weight: "250 g",
    categorySlug: "lacticinios",
    priceCents: 219,
    imageUrl: null,
    storeName: "Pingo Doce",
    storeId: "pingo_doce",
    productUrl: "https://www.pingodoce.pt/produto/manteiga-milhafre-com-sal-250g",
    keywords: ["manteiga", "milhafre", "sal", "acores", "açores"],
  },
  {
    id: "pd-milhafre-sem-sal-250",
    name: "Manteiga Milhafre sem Sal 250 g",
    brand: "Milhafre",
    weight: "250 g",
    categorySlug: "lacticinios",
    priceCents: 219,
    imageUrl: null,
    storeName: "Pingo Doce",
    storeId: "pingo_doce",
    productUrl: "https://www.pingodoce.pt/produto/manteiga-milhafre-sem-sal-250g",
    keywords: ["manteiga", "milhafre", "sem sal"],
  },
  {
    id: "cont-vigor-meio-gordo-1l",
    name: "Leite Vigor Meio Gordo 1 L",
    brand: "Vigor",
    weight: "1 L",
    categorySlug: "lacticinios",
    priceCents: 89,
    imageUrl: null,
    storeName: "Continente",
    storeId: "continente",
    productUrl: "https://www.continente.pt/produto/leite-vigor-meio-gordo-1l",
    keywords: ["leite", "vigor", "meio gordo", "litro"],
  },
  {
    id: "pd-vigor-meio-gordo-1l",
    name: "Leite Vigor Meio Gordo UHT 1 L",
    brand: "Vigor",
    weight: "1 L",
    categorySlug: "lacticinios",
    priceCents: 85,
    imageUrl: null,
    storeName: "Pingo Doce",
    storeId: "pingo_doce",
    productUrl: "https://www.pingodoce.pt/produto/leite-vigor-meio-gordo-1l",
    keywords: ["leite", "vigor", "meio gordo"],
  },
  {
    id: "cont-delta-molido-250",
    name: "Café Delta Moído 250 g",
    brand: "Delta",
    weight: "250 g",
    categorySlug: "mercearia",
    priceCents: 329,
    imageUrl: null,
    storeName: "Continente",
    storeId: "continente",
    productUrl: "https://www.continente.pt/produto/cafe-delta-moido-250g",
    keywords: ["cafe", "café", "delta", "moido", "moído"],
  },
  {
    id: "pd-delta-soluvel-200",
    name: "Café Delta Solúvel 200 g",
    brand: "Delta",
    weight: "200 g",
    categorySlug: "mercearia",
    priceCents: 449,
    imageUrl: null,
    storeName: "Pingo Doce",
    storeId: "pingo_doce",
    productUrl: "https://www.pingodoce.pt/produto/cafe-delta-soluvel-200g",
    keywords: ["cafe", "café", "delta", "soluvel", "solúvel"],
  },
  {
    id: "cont-banana-kg",
    name: "Banana importada (kg)",
    brand: null,
    weight: "1 kg",
    categorySlug: "fruta",
    priceCents: 149,
    imageUrl: null,
    storeName: "Continente",
    storeId: "continente",
    productUrl: "https://www.continente.pt/produto/banana",
    keywords: ["banana", "bananas", "fruta"],
  },
  {
    id: "pd-banana-kg",
    name: "Banana (kg)",
    brand: null,
    weight: "1 kg",
    categorySlug: "fruta",
    priceCents: 139,
    imageUrl: null,
    storeName: "Pingo Doce",
    storeId: "pingo_doce",
    productUrl: "https://www.pingodoce.pt/produto/banana",
    keywords: ["banana", "bananas"],
  },
  {
    id: "cont-pao-forma",
    name: "Pão de forma Continente 700 g",
    brand: "Continente",
    weight: "700 g",
    categorySlug: "padaria",
    priceCents: 129,
    imageUrl: null,
    storeName: "Continente",
    storeId: "continente",
    productUrl: "https://www.continente.pt/produto/pao-forma",
    keywords: ["pao", "pão", "forma"],
  },
  {
    id: "pd-ovos-12",
    name: "Ovos classe M 12 un.",
    brand: "Pingo Doce",
    weight: "12 un",
    categorySlug: "lacticinios",
    priceCents: 249,
    imageUrl: null,
    storeName: "Pingo Doce",
    storeId: "pingo_doce",
    productUrl: "https://www.pingodoce.pt/produto/ovos-12",
    keywords: ["ovos", "ovo"],
  },
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function searchCatalog(
  query: string,
  storeFilter?: StoreProviderId,
): ProductMatch[] {
  const q = normalize(query);
  const tokens = q.split(" ").filter((t) => t.length > 1);
  const results: ProductMatch[] = [];

  for (const entry of CATALOG) {
    if (storeFilter && entry.storeId !== storeFilter) continue;
    const hay = normalize([entry.name, entry.brand, ...entry.keywords].filter(Boolean).join(" "));
    let hits = 0;
    for (const t of tokens) {
      if (hay.includes(t)) hits += 1;
    }
    if (hits === 0) continue;
    const score = hits / Math.max(tokens.length, 1);
    if (score < 0.35) continue;
    const { keywords: _k, ...product } = entry;
    results.push({ ...product, score });
  }

  return results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

export function quoteFromCatalog(
  productName: string,
  storeId: StoreProviderId,
): ProductMatch | null {
  const hits = searchCatalog(productName, storeId);
  return hits[0] ?? null;
}
