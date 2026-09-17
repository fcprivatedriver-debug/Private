/**
 * Providers de supermercado — leem cache ExtProduct (importação manual).
 * Sem scraping; sem catálogo hardcoded como preço actual.
 */

import type { ProductMatch, StoreProductProvider, StoreProviderId } from "../types";
import { searchCachedProducts, quoteCachedProduct } from "@/lib/external-data/query/products";

function storeIdToLabel(id: StoreProviderId): string {
  switch (id) {
    case "continente":
      return "Continente";
    case "pingo_doce":
      return "Pingo Doce";
    case "auchan":
      return "Auchan";
    default:
      return id;
  }
}

function toMatch(hit: Awaited<ReturnType<typeof searchCachedProducts>>[number]): ProductMatch {
  return {
    id: hit.id,
    name: hit.name,
    brand: hit.brand,
    weight: hit.packageLabel,
    categorySlug: null,
    priceCents: hit.priceCents,
    pricePerUnitCents: hit.unitPriceCents,
    unitLabel: hit.unitLabel,
    imageUrl: null,
    storeName: storeIdToLabel(hit.store as StoreProviderId),
    storeId: hit.store as StoreProviderId,
    productUrl: hit.productUrl,
    regularPriceCents: hit.regularPriceCents,
    promoPriceCents: hit.promoPriceCents,
    updatedAt: hit.freshness.fetchedAt,
    source: hit.freshness.source,
  };
}

function makeDbProvider(id: StoreProviderId): StoreProductProvider {
  return {
    id,
    label: storeIdToLabel(id),
    async search(query: string) {
      const hits = await searchCachedProducts({ query, store: id, limit: 12 });
      return hits.map(toMatch);
    },
    async quote(productName: string) {
      const hit = await quoteCachedProduct(id, productName);
      return hit ? toMatch(hit) : null;
    },
  };
}

export const continenteProvider = makeDbProvider("continente");
export const pingoDoceProvider = makeDbProvider("pingo_doce");
export const auchanProvider = makeDbProvider("auchan");
