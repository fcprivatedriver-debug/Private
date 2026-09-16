/**
 * Orquestração de sync por fonte.
 */

import type { ExternalDataSource } from "@prisma/client";
import { runSync, type SyncResult, type SyncTrigger } from "./runner";
import { createDgegFuelSyncer, isDgegSyncAllowed } from "./dgeg-fuel";
import { mobieLisboaSyncer, isMobieLisboaSyncAllowed } from "./mobie-lisboa";

export type SyncableSource = Extract<
  ExternalDataSource,
  "DGEG_FUEL" | "MOBIE_LISBOA" | "CONTINENTE" | "PINGO_DOCE" | "AUCHAN"
>;

export async function syncSource(
  source: SyncableSource,
  opts: {
    triggeredBy: SyncTrigger;
    force?: boolean;
    /** Admin: páginas extra DGEG (cuidado com tempo Vercel). */
    dgegMaxPages?: number;
  },
): Promise<SyncResult> {
  switch (source) {
    case "DGEG_FUEL": {
      const gate = isDgegSyncAllowed();
      if (!gate.ok) {
        return {
          source,
          status: "FAILED",
          syncId: "",
          recordsSeen: 0,
          recordsUpserted: 0,
          errorSummary: gate.reason ?? "DGEG sync não autorizado",
        };
      }
      return runSync(
        source,
        createDgegFuelSyncer({
          maxPagesPerType: opts.dgegMaxPages ?? (opts.triggeredBy === "cron" ? 2 : 5),
        }),
        { triggeredBy: opts.triggeredBy, force: opts.force },
      );
    }
    case "MOBIE_LISBOA": {
      const gate = isMobieLisboaSyncAllowed();
      if (!gate.ok) {
        return {
          source,
          status: "FAILED",
          syncId: "",
          recordsSeen: 0,
          recordsUpserted: 0,
          errorSummary: gate.reason ?? "MOBI Lisboa sync desligado",
        };
      }
      return runSync(source, mobieLisboaSyncer, {
        triggeredBy: opts.triggeredBy,
        force: opts.force,
      });
    }
    case "CONTINENTE":
    case "PINGO_DOCE":
    case "AUCHAN":
      return {
        source,
        status: "FAILED",
        syncId: "",
        recordsSeen: 0,
        recordsUpserted: 0,
        errorSummary:
          "Atualização automática indisponível para este supermercado. Use importação manual CSV/JSON.",
      };
    default:
      return {
        source,
        status: "FAILED",
        syncId: "",
        recordsSeen: 0,
        recordsUpserted: 0,
        errorSummary: "Fonte desconhecida",
      };
  }
}

/**
 * Cron diário (Hobby-compatible: 1×/dia).
 * DGEG, quando autorizado, corre no mesmo job; para frequência >1×/dia
 * usar admin «Atualizar agora» ou plano Vercel com crons mais frequentes.
 */
export async function runScheduledSyncs(triggeredBy: SyncTrigger = "cron"): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  // MOBI Lisboa — CC0, seguro por omissão
  results.push(await syncSource("MOBIE_LISBOA", { triggeredBy }));
  // DGEG — só se Partilha confirmada
  if (isDgegSyncAllowed().ok) {
    results.push(await syncSource("DGEG_FUEL", { triggeredBy }));
  }
  return results;
}
