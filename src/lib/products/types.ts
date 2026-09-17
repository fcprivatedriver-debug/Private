export type StoreProviderId =
  | "continente"
  | "pingo_doce"
  | "auchan"
  | "lidl"
  | "aldi"
  | "froiz"
  | "intermarche"
  | "mercadona";

export type ProductMatch = {
  id: string;
  name: string;
  brand: string | null;
  weight: string | null;
  categorySlug: string | null;
  priceCents: number | null;
  /** Preço por unidade normalizado quando disponível (cêntimos / kg|L|un) */
  pricePerUnitCents?: number | null;
  unitLabel?: string | null;
  imageUrl: string | null;
  storeName: string;
  storeId: StoreProviderId;
  productUrl: string | null;
  storeLocationId?: string | null;
  regularPriceCents?: number | null;
  promoPriceCents?: number | null;
  updatedAt?: string | null;
  source?: string | null;
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
  updatedAt?: string | null;
  source?: string | null;
  complete?: boolean;
};

export type BasketCompareResult = {
  quotes: StorePriceQuote[];
  best: StorePriceQuote | null;
  savingsCents: number;
  unavailableReason?: string;
};

export interface StoreProductProvider {
  id: StoreProviderId;
  label: string;
  search(query: string): Promise<ProductMatch[]>;
  quote?(productName: string): Promise<ProductMatch | null>;
}
