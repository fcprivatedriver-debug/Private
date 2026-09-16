/**
 * Provider combustível — lê cache addYknow (ExtFuel*).
 *
 * Sync DGEG só com Partilha confirmada (ver sync/dgeg-fuel.ts).
 * Zero postos inventados.
 */

import type { FuelProvider, FuelQuoteContext, FuelStation, FuelType } from "../types";
import { searchCachedFuel } from "@/lib/external-data/query/fuel";

export type FuelProviderStatus = {
  id: string;
  available: boolean;
  reason: string;
  licenseNote: string;
};

export const DGEG_PROVIDER_STATUS: FuelProviderStatus = {
  id: "dgeg",
  available: false, // actualizado dinamicamente via hasCachedFuelData
  reason:
    "Preços de combustível indisponíveis. É necessário acordo de Partilha de Informação com a DGEG e sincronização activa.",
  licenseNote:
    "O portal DGEG proíbe utilização comercial sem parceria. Não fazer scraping nem apresentar dados fictícios.",
};

function mapAppFuelType(t: FuelType): string {
  if (t === "diesel") return "diesel";
  if (t === "lpg") return "lpg";
  return "petrol";
}

export const dgegFuelProvider: FuelProvider = {
  id: "dgeg",
  label: "DGEG (cache addYknow)",
  async search(ctx: FuelQuoteContext): Promise<FuelStation[]> {
    if (ctx.lat == null || ctx.lng == null) return [];

    const { stations } = await searchCachedFuel({
      lat: ctx.lat,
      lng: ctx.lng,
      fuelType: mapAppFuelType(ctx.fuelType),
      radiusKm: 30,
      limit: 20,
    });

    return stations.map((s) => ({
      id: s.id,
      name: s.name,
      brand: s.brand,
      fuelType: ctx.fuelType,
      // Engine espera milésimos (documentado como pricePerLitreCents historicamente)
      pricePerLitreCents: s.priceMilli,
      lat: s.lat,
      lng: s.lng,
      distanceKm: s.distanceKm,
      address: s.address,
      cardsAccepted: [],
      mapsUrl: s.mapsUrl,
      // Extensões usadas pela MEL (cast-friendly)
      ...( {
        updatedLabel: s.freshness.label,
        stale: s.freshness.stale,
        source: s.freshness.source,
        fuelLabel: s.fuelLabel,
      } as object),
    }));
  },
};
