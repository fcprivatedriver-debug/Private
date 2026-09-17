/**
 * Framework de sincronização — logging, locking simples, idempotência.
 * Nunca apaga dados anteriores em caso de falha.
 */

import type { ExternalDataSource, ExternalSyncStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export type SyncTrigger = "cron" | "admin" | "import" | "test";

export type SyncResult = {
  source: ExternalDataSource;
  status: ExternalSyncStatus;
  syncId: string;
  recordsSeen: number;
  recordsUpserted: number;
  errorSummary: string | null;
  meta?: Record<string, unknown>;
};

export type SyncerFn = (ctx: {
  syncId: string;
  triggeredBy: SyncTrigger;
  signal?: AbortSignal;
}) => Promise<{
  recordsSeen: number;
  recordsUpserted: number;
  meta?: Record<string, unknown>;
  partialError?: string;
}>;

const running = new Set<ExternalDataSource>();

export async function runSync(
  source: ExternalDataSource,
  syncer: SyncerFn,
  opts: { triggeredBy: SyncTrigger; force?: boolean } = { triggeredBy: "admin" },
): Promise<SyncResult> {
  if (running.has(source) && !opts.force) {
    return {
      source,
      status: "FAILED",
      syncId: "",
      recordsSeen: 0,
      recordsUpserted: 0,
      errorSummary: "Sincronização já em curso para esta fonte (lock).",
    };
  }

  // Lock DB: se há RUNNING recente (< 15 min), recusar
  const recent = await prisma.externalDataSync.findFirst({
    where: {
      source,
      status: "RUNNING",
      startedAt: { gte: new Date(Date.now() - 15 * 60_000) },
    },
    orderBy: { startedAt: "desc" },
  });
  if (recent && !opts.force) {
    return {
      source,
      status: "FAILED",
      syncId: recent.id,
      recordsSeen: 0,
      recordsUpserted: 0,
      errorSummary: "Já existe uma sincronização RUNNING recente.",
    };
  }

  running.add(source);
  const row = await prisma.externalDataSync.create({
    data: {
      source,
      status: "RUNNING",
      triggeredBy: opts.triggeredBy,
    },
  });

  try {
    const out = await syncer({ syncId: row.id, triggeredBy: opts.triggeredBy });
    const status: ExternalSyncStatus = out.partialError ? "PARTIAL" : "SUCCESS";
    await prisma.externalDataSync.update({
      where: { id: row.id },
      data: {
        status,
        finishedAt: new Date(),
        recordsSeen: out.recordsSeen,
        recordsUpserted: out.recordsUpserted,
        errorSummary: out.partialError ?? null,
        metaJson: out.meta ? JSON.stringify(out.meta) : null,
      },
    });
    return {
      source,
      status,
      syncId: row.id,
      recordsSeen: out.recordsSeen,
      recordsUpserted: out.recordsUpserted,
      errorSummary: out.partialError ?? null,
      meta: out.meta,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 500) : "Erro desconhecido";
    await prisma.externalDataSync.update({
      where: { id: row.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorSummary: message,
      },
    });
    return {
      source,
      status: "FAILED",
      syncId: row.id,
      recordsSeen: 0,
      recordsUpserted: 0,
      errorSummary: message,
    };
  } finally {
    running.delete(source);
  }
}

export async function getLatestSync(source: ExternalDataSource) {
  return prisma.externalDataSync.findFirst({
    where: { source },
    orderBy: { startedAt: "desc" },
  });
}

export async function getLatestSuccessfulSync(source: ExternalDataSource) {
  return prisma.externalDataSync.findFirst({
    where: { source, status: { in: ["SUCCESS", "PARTIAL"] } },
    orderBy: { finishedAt: "desc" },
  });
}
