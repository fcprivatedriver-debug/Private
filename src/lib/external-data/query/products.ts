/**
 * Consultas à cache de produtos de supermercado.
 */

import { prisma } from "@/lib/db";
import { buildFreshness } from "../freshness";
import { TTL, isStale } from "../ttl";
import type { ExternalDataSource } from "@prisma/client";

const STORE_SOURCE: Record<string, ExternalDataSource> = {
  continente: "CONTINENTE",
  pingo_doce: "PINGO_DOCE",
  auchan: "AUCHAN",
};

export type CachedProductHit = {
  id: string;
  externalId: string;
  store: string;
  name: string;
  brand: string | null;
  packageLabel: string | null;
  priceCents: number;
  regularPriceCents: number | null;
  promoPriceCents: number | null;
  unitPriceCents: number | null;
  unitLabel: string | null;
  productUrl: string | null;
  freshness: ReturnType<typeof buildFreshness>;
};

export async function searchCachedProducts(opts: {
  query: string;
  store?: string;
  limit?: number;
}): Promise<CachedProductHit[]> {
  const q = opts.query.trim();
  if (!q) return [];
  const limit = opts.limit ?? 20;

  const source = opts.store ? STORE_SOURCE[opts.store] : undefined;

  const products = await prisma.extProduct.findMany({
    where: {
      ...(source ? { source } : {}),
      ...(opts.store ? { store: opts.store } : {}),
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { categoryKey: { contains: q.toLowerCase(), mode: "insensitive" } },
      ],
    },
    include: {
      prices: { orderBy: { fetchedAt: "desc" }, take: 1 },
    },
    take: limit,
  });

  const hits: CachedProductHit[] = [];
  for (const p of products) {
    const price = p.prices[0];
    if (!price || price.priceCents <= 0) continue;
    hits.push({
      id: p.id,
      externalId: p.externalId,
      store: p.store,
      name: p.name,
      brand: p.brand,
      packageLabel: p.packageLabel,
      priceCents: price.priceCents,
      regularPriceCents: price.regularPriceCents,
      promoPriceCents: price.promoPriceCents,
      unitPriceCents: price.unitPriceCents,
      unitLabel: price.unitLabel,
      productUrl: p.productUrl,
      freshness: buildFreshness({
        fetchedAt: price.fetchedAt,
        sourceUpdatedAt: price.sourceUpdatedAt,
        stale: isStale(price.fetchedAt, TTL.PRODUCT_STALE_MS),
        source: p.source,
      }),
    });
  }
  return hits;
}

export async function quoteCachedProduct(
  store: string,
  productName: string,
): Promise<CachedProductHit | null> {
  const hits = await searchCachedProducts({ query: productName, store, limit: 5 });
  if (hits.length === 0) return null;
  // Prefer exact-ish name match
  const lower = productName.toLowerCase();
  const exact = hits.find((h) => h.name.toLowerCase() === lower);
  return exact ?? hits[0];
}
