/**
 * Product Service — camada isolada entre a Nina e os supermercados.
 * A UI e as actions NUNCA falam diretamente com Continente/Pingo Doce.
 * Trocar o provider (scraping → API oficial) não muda a lógica de negócio.
 */

export type StoreProviderId = "continente" | "pingo_doce" | "lidl" | "aldi";

export type ProductMatch = {
  id: string;
  name: string;
  brand: string | null;
  weight: string | null;
  categorySlug: string | null;
  priceCents: number | null;
  imageUrl: string | null;
  storeName: string;
  storeId: StoreProviderId;
  productUrl: string | null;
  /** Score interno 0–1 para escolher o melhor match */
  score?: number;
};

export type ProductSearchResult =
  | { status: "exact"; product: ProductMatch }
  | { status: "choices"; products: ProductMatch[]; query: string }
  | { status: "none"; query: string };

export type StorePriceQuote = {
  storeId: StoreProviderId;
  storeName: string;
  totalCents: number;
  missing: string[];
  lines: { name: string; priceCents: number | null; found: boolean }[];
};

export type BasketCompareResult = {
  quotes: StorePriceQuote[];
  best: StorePriceQuote | null;
  savingsCents: number;
};

export interface StoreProductProvider {
  id: StoreProviderId;
  label: string;
  /** Pesquisa produtos — pode usar web, API ou catálogo local. */
  search(query: string): Promise<ProductMatch[]>;
  /** Cotação aproximada para um nome de produto (lista de compras). */
  quote?(productName: string): Promise<ProductMatch | null>;
}
