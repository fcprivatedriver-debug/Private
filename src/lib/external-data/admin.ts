/**
 * Estado admin + autenticação técnica para sync/import.
 */

import type { ExternalDataSource } from "@prisma/client";
import { prisma } from "@/lib/db";
import { SOURCE_CATALOG } from "./catalog";
import { getLatestSync, getLatestSuccessfulSync } from "./sync/runner";
import { isDgegSyncAllowed } from "./sync/dgeg-fuel";
import { isMobieLisboaSyncAllowed } from "./sync/mobie-lisboa";

export function assertExternalDataAdmin(adminKey: string): { ok: true } | { ok: false; error: string } {
  const expected =
    process.env.EXTERNAL_DATA_ADMIN_KEY?.trim() ||
    process.env.PRODUCT_ACCESS_ADMIN_KEY?.trim();
  if (!expected || adminKey !== expected) {
    return { ok: false, error: "Não autorizado" };
  }
  return { ok: true };
}

export function assertCronAuth(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  if (!authHeader) return false;
  const expected = `Bearer ${secret}`;
  return authHeader === expected;
}

export async function getExternalDataAdminSnapshot() {
  const sources: ExternalDataSource[] = [
    "CONTINENTE",
    "PINGO_DOCE",
    "AUCHAN",
    "DGEG_FUEL",
    "MOBIE_LISBOA",
  ];

  const rows = await Promise.all(
    sources.map(async (source) => {
      const desc = SOURCE_CATALOG.find((s) => s.id === source);
      const latest = await getLatestSync(source);
      const lastOk = await getLatestSuccessfulSync(source);
      let recordCount = 0;
      if (source === "DGEG_FUEL") {
        recordCount = await prisma.extFuelStation.count({ where: { source: "DGEG_FUEL" } });
      } else if (source === "MOBIE_LISBOA") {
        recordCount = await prisma.extChargingStation.count({ where: { source: "MOBIE_LISBOA" } });
      } else {
        recordCount = await prisma.extProduct.count({ where: { source } });
      }

      let gate: string | null = null;
      if (source === "DGEG_FUEL") {
        const g = isDgegSyncAllowed();
        gate = g.ok ? "autorizado" : g.reason ?? "bloqueado";
      }
      if (source === "MOBIE_LISBOA") {
        const g = isMobieLisboaSyncAllowed();
        gate = g.ok ? "autorizado" : g.reason ?? "bloqueado";
      }

      return {
        source,
        label: desc?.label ?? source,
        automation: desc?.automation,
        commercial: desc?.commercial,
        frequency: desc?.frequency,
        recordCount,
        gate,
        lastAttempt: latest
          ? {
              status: latest.status,
              startedAt: latest.startedAt.toISOString(),
              finishedAt: latest.finishedAt?.toISOString() ?? null,
              recordsUpserted: latest.recordsUpserted,
              errorSummary: latest.errorSummary,
              triggeredBy: latest.triggeredBy,
            }
          : null,
        lastSuccess: lastOk
          ? {
              finishedAt: lastOk.finishedAt?.toISOString() ?? null,
              recordsUpserted: lastOk.recordsUpserted,
            }
          : null,
      };
    }),
  );

  return { sources: rows, generatedAt: new Date().toISOString() };
}
