import { prisma } from "@/lib/db";

export type AuditKind = "INCOME" | "EXPENSE";
export type AuditAction = "CREATE" | "UPDATE" | "DELETE";

export async function logTransactionAudit(opts: {
  familyId: string;
  kind: AuditKind;
  recordId: string;
  action: AuditAction;
  actorUserId: string | null;
  actorDisplayName: string;
  summary?: string;
  payload?: Record<string, unknown>;
}) {
  await prisma.transactionAuditLog.create({
    data: {
      familyId: opts.familyId,
      kind: opts.kind,
      recordId: opts.recordId,
      action: opts.action,
      actorUserId: opts.actorUserId,
      actorDisplayName: opts.actorDisplayName,
      summary: opts.summary ?? null,
      payloadJson: opts.payload ? JSON.stringify(opts.payload) : null,
    },
  });
}

export function formatAuditWhen(d: Date) {
  return d.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function authorLabel(opts: {
  memberDisplayName?: string | null;
  createdByName?: string | null;
  fallback?: string;
}) {
  return (
    opts.memberDisplayName?.trim() ||
    opts.createdByName?.trim() ||
    opts.fallback ||
    "Alguém"
  );
}
