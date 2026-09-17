/**
 * Syncer DGEG — preços de combustíveis (API pública do portal).
 *
 * UTILIZAÇÃO COMERCIAL: proibida nos termos do portal sem Partilha de Informação.
 * Só corre com DGEG_FUEL_ENABLED=true E DGEG_PARTILHA_ACK=true.
 *
 * Endpoint verificado live: /api/PrecoComb/PesquisarPostos
 * NÃO inventar outros endpoints.
 */

import { prisma } from "@/lib/db";
import type { SyncerFn } from "./runner";

const DGEG_BASE = "https://precoscombustiveis.dgeg.gov.pt/api/PrecoComb";

/** Tipos prioritários verificados em GetTiposCombustiveis. */
export const DGEG_FUEL_TYPES: { id: number; slug: string; label: string }[] = [
  { id: 2101, slug: "gasoleo_simples", label: "Gasóleo simples" },
  { id: 2105, slug: "gasoleo_especial", label: "Gasóleo especial" },
  { id: 3201, slug: "gasolina_95", label: "Gasolina simples 95" },
  { id: 3400, slug: "gasolina_98", label: "Gasolina 98" },
  { id: 1120, slug: "gpl", label: "GPL Auto" },
];

export function isDgegSyncAllowed(): { ok: boolean; reason?: string } {
  if (process.env.DGEG_FUEL_ENABLED !== "true") {
    return {
      ok: false,
      reason: "DGEG_FUEL_ENABLED≠true — sync desligado (requer Partilha de Informação).",
    };
  }
  if (process.env.DGEG_PARTILHA_ACK !== "true") {
    return {
      ok: false,
      reason:
        "DGEG_PARTILHA_ACK≠true — confirma acordo de Partilha com a DGEG antes de sincronizar.",
    };
  }
  return { ok: true };
}

type DgegPosto = {
  Id: number;
  Nome: string;
  TipoPosto?: string;
  Municipio?: string;
  Preco: string;
  Marca?: string;
  Combustivel: string;
  DataAtualizacao?: string;
  Distrito?: string;
  Morada?: string;
  Localidade?: string;
  CodPostal?: string;
  Latitude: number;
  Longitude: number;
  Quantidade?: number;
};

export function parseDgegPriceToMilli(preco: string): number | null {
  // "1,899 €" → 1899
  const m = preco.replace(/\s/g, "").match(/(\d+)[,.](\d{1,3})/);
  if (!m) return null;
  const euros = Number(m[1]);
  const frac = m[2].padEnd(3, "0").slice(0, 3);
  if (!Number.isFinite(euros)) return null;
  return euros * 1000 + Number(frac);
}

export function parseDgegDate(raw?: string): Date | null {
  if (!raw) return null;
  // "2026-09-15 08:40"
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) return null;
  const d = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
  );
  return Number.isNaN(d.getTime()) ? null : d;
}

async function fetchPage(
  fuelTypeId: number,
  pageNr: number,
  pageSize: number,
  signal?: AbortSignal,
): Promise<DgegPosto[]> {
  const url = `${DGEG_BASE}/PesquisarPostos?idsTiposComb=${fuelTypeId}&pageNr=${pageNr}&pageSize=${pageSize}`;
  const res = await fetch(url, {
    signal,
    headers: { Accept: "application/json", "User-Agent": "addYknow-sync/1.0" },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`DGEG HTTP ${res.status} (tipo ${fuelTypeId} p${pageNr})`);
  }
  const body = (await res.json()) as {
    status?: boolean;
    mensagem?: string;
    resultado?: DgegPosto[];
  };
  if (!body.status || !Array.isArray(body.resultado)) {
    throw new Error(`DGEG resposta inválida: ${body.mensagem ?? "sem resultado"}`);
  }
  return body.resultado;
}

/**
 * Sync limitado por tempo (Vercel ~60s): uma página por tipo ou chunk.
 * `maxPagesPerType` default 3 (~150 postos/tipo) para cron; admin pode forçar mais.
 */
export function createDgegFuelSyncer(opts?: {
  pageSize?: number;
  maxPagesPerType?: number;
  fuelTypeIds?: number[];
}): SyncerFn {
  const pageSize = opts?.pageSize ?? 50;
  const maxPages = opts?.maxPagesPerType ?? 3;
  const typeIds = opts?.fuelTypeIds ?? DGEG_FUEL_TYPES.map((t) => t.id);

  return async ({ signal }) => {
    const gate = isDgegSyncAllowed();
    if (!gate.ok) {
      throw new Error(gate.reason);
    }

    const fetchedAt = new Date();
    let recordsSeen = 0;
    let recordsUpserted = 0;
    const errors: string[] = [];
    const byType: Record<string, number> = {};

    for (const typeMeta of DGEG_FUEL_TYPES.filter((t) => typeIds.includes(t.id))) {
      let page = 1;
      let totalForType = 0;
      while (page <= maxPages) {
        let rows: DgegPosto[];
        try {
          rows = await fetchPage(typeMeta.id, page, pageSize, signal);
        } catch (e) {
          errors.push(e instanceof Error ? e.message : String(e));
          break;
        }
        if (rows.length === 0) break;
        recordsSeen += rows.length;
        totalForType += rows.length;

        for (const row of rows) {
          if (
            typeof row.Latitude !== "number" ||
            typeof row.Longitude !== "number" ||
            !Number.isFinite(row.Latitude) ||
            !Number.isFinite(row.Longitude)
          ) {
            continue;
          }
          const priceMilli = parseDgegPriceToMilli(row.Preco);
          if (priceMilli == null || priceMilli <= 0) continue;

          const externalId = String(row.Id);
          const station = await prisma.extFuelStation.upsert({
            where: {
              source_externalId: { source: "DGEG_FUEL", externalId },
            },
            create: {
              source: "DGEG_FUEL",
              externalId,
              name: row.Nome || `Posto ${externalId}`,
              brand: row.Marca ?? null,
              address: row.Morada ?? null,
              locality: row.Localidade ?? null,
              municipality: row.Municipio ?? null,
              district: row.Distrito ?? null,
              postalCode: row.CodPostal ?? null,
              lat: row.Latitude,
              lng: row.Longitude,
              stationKind: row.TipoPosto ?? null,
              fetchedAt,
            },
            update: {
              name: row.Nome || `Posto ${externalId}`,
              brand: row.Marca ?? null,
              address: row.Morada ?? null,
              locality: row.Localidade ?? null,
              municipality: row.Municipio ?? null,
              district: row.Distrito ?? null,
              postalCode: row.CodPostal ?? null,
              lat: row.Latitude,
              lng: row.Longitude,
              stationKind: row.TipoPosto ?? null,
              fetchedAt,
            },
          });

          await prisma.extFuelPrice.upsert({
            where: {
              stationId_fuelType: {
                stationId: station.id,
                fuelType: typeMeta.slug,
              },
            },
            create: {
              stationId: station.id,
              fuelType: typeMeta.slug,
              fuelLabel: typeMeta.label,
              priceMilli,
              sourceUpdatedAt: parseDgegDate(row.DataAtualizacao),
              fetchedAt,
            },
            update: {
              fuelLabel: typeMeta.label,
              priceMilli,
              sourceUpdatedAt: parseDgegDate(row.DataAtualizacao),
              fetchedAt,
            },
          });
          recordsUpserted += 1;
        }

        // Se a página veio incompleta, não há mais
        if (rows.length < pageSize) break;
        // Quantidade no primeiro registo indica total — parar se já cobrimos
        const qty = rows[0]?.Quantidade as number | undefined;
        if (typeof qty === "number" && page * pageSize >= qty) break;
        page += 1;
        // Rate limit educado
        await new Promise((r) => setTimeout(r, 200));
      }
      byType[typeMeta.slug] = totalForType;
    }

    return {
      recordsSeen,
      recordsUpserted,
      meta: { byType, pageSize, maxPages, base: DGEG_BASE },
      partialError: errors.length ? errors.slice(0, 3).join("; ") : undefined,
    };
  };
}

export const dgegFuelSyncer = createDgegFuelSyncer();
