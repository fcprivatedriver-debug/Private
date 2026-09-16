/**
 * Consultas à cache de combustíveis (BD addYknow).
 * Sem pedidos à DGEG no caminho do utilizador.
 */

import { prisma } from "@/lib/db";
import { haversineKm, roundKm } from "../geo";
import { buildFreshness } from "../freshness";
import { TTL, isStale } from "../ttl";

export type CachedFuelHit = {
  id: string;
  externalId: string;
  name: string;
  brand: string | null;
  address: string;
  lat: number;
  lng: number;
  distanceKm: number;
  fuelType: string;
  fuelLabel: string;
  /** milésimos de euro / L (1899 = 1,899 €) */
  priceMilli: number;
  freshness: ReturnType<typeof buildFreshness>;
  mapsUrl: string;
};

const FUEL_TYPE_ALIASES: Record<string, string[]> = {
  diesel: ["gasoleo_simples", "gasoleo_especial"],
  petrol: ["gasolina_95", "gasolina_98"],
  lpg: ["gpl"],
  gasoleo_simples: ["gasoleo_simples"],
  gasoleo_especial: ["gasoleo_especial"],
  gasolina_95: ["gasolina_95"],
  gasolina_98: ["gasolina_98"],
  gpl: ["gpl"],
};

export function resolveFuelTypeSlugs(fuelType: string): string[] {
  const key = fuelType.toLowerCase().trim();
  return FUEL_TYPE_ALIASES[key] ?? [key];
}

export async function searchCachedFuel(opts: {
  lat: number;
  lng: number;
  fuelType: string;
  radiusKm?: number;
  limit?: number;
}): Promise<{ stations: CachedFuelHit[]; unavailableReason?: string }> {
  const slugs = resolveFuelTypeSlugs(opts.fuelType);
  const radiusKm = opts.radiusKm ?? 25;
  const limit = opts.limit ?? 12;

  // Bounding box aproximado para reduzir scan
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((opts.lat * Math.PI) / 180));

  const stations = await prisma.extFuelStation.findMany({
    where: {
      source: "DGEG_FUEL",
      lat: { gte: opts.lat - latDelta, lte: opts.lat + latDelta },
      lng: { gte: opts.lng - lngDelta, lte: opts.lng + lngDelta },
      prices: { some: { fuelType: { in: slugs } } },
    },
    include: {
      prices: { where: { fuelType: { in: slugs } } },
    },
    take: 400,
  });

  if (stations.length === 0) {
    const any = await prisma.extFuelStation.count({ where: { source: "DGEG_FUEL" } });
    return {
      stations: [],
      unavailableReason:
        any === 0
          ? "Preços de combustível indisponíveis na cache addYknow. É necessário sincronização DGEG autorizada (Partilha de Informação)."
          : `Sem postos com ${opts.fuelType} num raio de ${radiusKm} km.`,
    };
  }

  const hits: CachedFuelHit[] = [];
  for (const s of stations) {
    const dist = haversineKm({ lat: opts.lat, lng: opts.lng }, { lat: s.lat, lng: s.lng });
    if (dist > radiusKm) continue;
    // Melhor preço entre tipos pedidos neste posto
    const price = [...s.prices].sort((a, b) => a.priceMilli - b.priceMilli)[0];
    if (!price) continue;
    const stale = isStale(price.fetchedAt, TTL.FUEL_STALE_MS);
    hits.push({
      id: s.id,
      externalId: s.externalId,
      name: s.name,
      brand: s.brand,
      address: [s.address, s.locality || s.municipality].filter(Boolean).join(", "),
      lat: s.lat,
      lng: s.lng,
      distanceKm: roundKm(dist),
      fuelType: price.fuelType,
      fuelLabel: price.fuelLabel,
      priceMilli: price.priceMilli,
      freshness: buildFreshness({
        fetchedAt: price.fetchedAt,
        sourceUpdatedAt: price.sourceUpdatedAt,
        stale,
        source: "DGEG",
      }),
      mapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`,
    });
  }

  hits.sort((a, b) => a.priceMilli - b.priceMilli || a.distanceKm - b.distanceKm);
  return { stations: hits.slice(0, limit) };
}
