/**
 * Syncer MOBI.E Lisboa — postos de carregamento (CC0, CM Lisboa).
 *
 * Fonte verificada live:
 * https://services.arcgis.com/1dSrzEWVQn5kHHyK/arcgis/rest/services/POITransportes/FeatureServer/2/query
 * Dataset dados.gov: 5ae9c6b5c8d8c9146d44cc4f (CC0)
 *
 * Dados estáticos: nome, morada, lat/lng, tomadas. Sem potência/tarifa/disponibilidade.
 */

import { prisma } from "@/lib/db";
import type { SyncerFn } from "./runner";

export const MOBIE_LISBOA_GEOJSON_URL =
  "https://services.arcgis.com/1dSrzEWVQn5kHHyK/arcgis/rest/services/POITransportes/FeatureServer/2/query?outFields=*&where=1%3D1&f=geojson";

export function isMobieLisboaSyncAllowed(): { ok: boolean; reason?: string } {
  // Ligado por omissão (CC0). Desligar com MOBIE_LISBOA_SYNC_ENABLED=false.
  if (process.env.MOBIE_LISBOA_SYNC_ENABLED === "false") {
    return { ok: false, reason: "MOBIE_LISBOA_SYNC_ENABLED=false" };
  }
  return { ok: true };
}

type GeoFeature = {
  id?: number | string;
  geometry?: { type?: string; coordinates?: [number, number] };
  properties?: {
    OBJECTID?: number;
    COD_SIG?: string;
    DESIGNACAO?: string;
    MORADA?: string;
    TOMADAS?: number;
    GlobalID?: string;
    USO?: string | null;
  };
};

export function mapMobieLisboaFeature(f: GeoFeature, fetchedAt: Date) {
  const coords = f.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  const [lng, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const p = f.properties ?? {};
  const externalId = String(p.COD_SIG || p.GlobalID || p.OBJECTID || f.id || "");
  if (!externalId) return null;
  const name = (p.DESIGNACAO || p.MORADA || `MOBI.E ${externalId}`).trim();
  return {
    source: "MOBIE_LISBOA" as const,
    externalId,
    name,
    address: p.MORADA ?? null,
    operator: "MOBI.E",
    network: "MOBI.E",
    lat,
    lng,
    powerKw: null as number | null,
    connectorCount: typeof p.TOMADAS === "number" ? p.TOMADAS : null,
    connectorTypes: null as string | null,
    availability: null as string | null,
    tariffJson: null as string | null,
    dataKind: "static",
    sourceUpdatedAt: null as Date | null,
    fetchedAt,
  };
}

export const mobieLisboaSyncer: SyncerFn = async ({ signal }) => {
  const gate = isMobieLisboaSyncAllowed();
  if (!gate.ok) throw new Error(gate.reason);

  const res = await fetch(MOBIE_LISBOA_GEOJSON_URL, {
    signal,
    headers: { Accept: "application/geo+json,application/json", "User-Agent": "addYknow-sync/1.0" },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`MOBI Lisboa HTTP ${res.status}`);
  }
  const body = (await res.json()) as { type?: string; features?: GeoFeature[] };
  if (!Array.isArray(body.features)) {
    throw new Error("MOBI Lisboa: GeoJSON sem features");
  }

  const fetchedAt = new Date();
  let recordsSeen = 0;
  let recordsUpserted = 0;

  for (const f of body.features) {
    recordsSeen += 1;
    const mapped = mapMobieLisboaFeature(f, fetchedAt);
    if (!mapped) continue;

    await prisma.extChargingStation.upsert({
      where: {
        source_externalId: { source: mapped.source, externalId: mapped.externalId },
      },
      create: mapped,
      update: {
        name: mapped.name,
        address: mapped.address,
        operator: mapped.operator,
        network: mapped.network,
        lat: mapped.lat,
        lng: mapped.lng,
        connectorCount: mapped.connectorCount,
        dataKind: mapped.dataKind,
        fetchedAt: mapped.fetchedAt,
      },
    });
    recordsUpserted += 1;
  }

  return {
    recordsSeen,
    recordsUpserted,
    meta: {
      url: MOBIE_LISBOA_GEOJSON_URL,
      license: "CC0",
      dataset: "dados.gov.pt/5ae9c6b5c8d8c9146d44cc4f",
      note: "Estático — sem tarifas nem disponibilidade em tempo real",
    },
  };
};
