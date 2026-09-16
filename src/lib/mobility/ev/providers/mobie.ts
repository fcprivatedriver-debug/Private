/**
 * Provider EV — lê cache addYknow (ExtChargingStation).
 * Fonte activa: MOBI.E Lisboa (CC0). Sem tarifas inventadas.
 */

import type { ChargingProvider, ChargingStation, EvConnector, EvContext } from "../types";
import { searchCachedChargers } from "@/lib/external-data/query/ev";

export type EvProviderStatus = {
  id: string;
  available: boolean;
  reason: string;
};

export const MOBIE_PROVIDER_STATUS: EvProviderStatus = {
  id: "mobie",
  available: false,
  reason:
    "Carregadores eléctricos indisponíveis na cache. Sincronize MOBI.E Lisboa (CC0) ou configure fonte autorizada.",
};

function guessConnector(): EvConnector {
  return "type2";
}

export const mobieChargingProvider: ChargingProvider = {
  id: "mobie",
  label: "MOBI.E (cache addYknow)",
  async search(ctx: EvContext): Promise<ChargingStation[]> {
    if (ctx.lat == null || ctx.lng == null) return [];

    const { stations } = await searchCachedChargers({
      lat: ctx.lat,
      lng: ctx.lng,
      radiusKm: 20,
      limit: 20,
    });

    return stations.map((s) => ({
      id: s.id,
      name: s.name,
      network: s.network,
      lat: s.lat,
      lng: s.lng,
      distanceKm: s.distanceKm,
      powerKw: s.powerKw ?? 0,
      connector: guessConnector(),
      pricePerKwhCents: null, // nunca inventar €/kWh
      address: s.address,
      mapsUrl: s.mapsUrl,
      cardsAccepted: [],
      ...( {
        updatedLabel: s.freshness.label,
        stale: s.freshness.stale,
        source: s.freshness.source,
        priceNote: s.priceNote,
        connectorCount: s.connectorCount,
        availability: s.availability,
      } as object),
    }));
  },
};

/** Placeholders futuros — nunca activos sem integração real. */
export const miioChargingProvider: ChargingProvider = {
  id: "miio",
  label: "Miio",
  async search() {
    return [];
  },
};

export const teslaChargingProvider: ChargingProvider = {
  id: "tesla",
  label: "Tesla",
  async search() {
    return [];
  },
};
