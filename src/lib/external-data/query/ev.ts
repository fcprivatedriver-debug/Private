/**
 * Consultas à cache de carregadores (BD addYknow).
 */

import { prisma } from "@/lib/db";
import { haversineKm, roundKm } from "../geo";
import { buildFreshness } from "../freshness";
import { TTL, isStale } from "../ttl";

export type CachedChargerHit = {
  id: string;
  externalId: string;
  name: string;
  network: string;
  operator: string | null;
  address: string;
  lat: number;
  lng: number;
  distanceKm: number;
  powerKw: number | null;
  connectorCount: number | null;
  availability: string | null;
  /** Componentes tarifários reais ou null */
  tariff: unknown | null;
  priceNote: "indisponivel" | "estimativa" | "componentes";
  freshness: ReturnType<typeof buildFreshness>;
  mapsUrl: string;
  dataKind: string;
};

export async function searchCachedChargers(opts: {
  lat: number;
  lng: number;
  radiusKm?: number;
  limit?: number;
  minPowerKw?: number;
}): Promise<{ stations: CachedChargerHit[]; unavailableReason?: string }> {
  const radiusKm = opts.radiusKm ?? 15;
  const limit = opts.limit ?? 12;
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((opts.lat * Math.PI) / 180));

  const stations = await prisma.extChargingStation.findMany({
    where: {
      lat: { gte: opts.lat - latDelta, lte: opts.lat + latDelta },
      lng: { gte: opts.lng - lngDelta, lte: opts.lng + lngDelta },
      ...(opts.minPowerKw != null ? { powerKw: { gte: opts.minPowerKw } } : {}),
    },
    take: 500,
  });

  if (stations.length === 0) {
    const any = await prisma.extChargingStation.count();
    return {
      stations: [],
      unavailableReason:
        any === 0
          ? "Carregadores eléctricos indisponíveis na cache. Execute a sincronização MOBI.E Lisboa (CC0) ou importe dados autorizados."
          : `Sem carregadores num raio de ${radiusKm} km (a cache actual cobre sobretudo Lisboa).`,
    };
  }

  const hits: CachedChargerHit[] = [];
  for (const s of stations) {
    const dist = haversineKm({ lat: opts.lat, lng: opts.lng }, { lat: s.lat, lng: s.lng });
    if (dist > radiusKm) continue;
    let tariff: unknown = null;
    if (s.tariffJson) {
      try {
        tariff = JSON.parse(s.tariffJson);
      } catch {
        tariff = null;
      }
    }
    const staleMs = s.dataKind === "dynamic" ? TTL.EV_DYNAMIC_STALE_MS : TTL.EV_STATIC_STALE_MS;
    hits.push({
      id: s.id,
      externalId: s.externalId,
      name: s.name,
      network: s.network || "MOBI.E",
      operator: s.operator,
      address: s.address || "",
      lat: s.lat,
      lng: s.lng,
      distanceKm: roundKm(dist),
      powerKw: s.powerKw,
      connectorCount: s.connectorCount,
      availability: s.availability,
      tariff,
      priceNote: tariff ? "componentes" : "indisponivel",
      freshness: buildFreshness({
        fetchedAt: s.fetchedAt,
        sourceUpdatedAt: s.sourceUpdatedAt,
        stale: isStale(s.fetchedAt, staleMs),
        source: s.source,
      }),
      mapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`,
      dataKind: s.dataKind,
    });
  }

  hits.sort((a, b) => a.distanceKm - b.distanceKm);
  return { stations: hits.slice(0, limit) };
}
