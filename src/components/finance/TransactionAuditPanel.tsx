import { formatAuditWhen } from "@/lib/transaction-audit";

type AuditRow = {
  id: string;
  action: string;
  actorDisplayName: string;
  summary: string | null;
  createdAt: Date;
};

const ACTION_LABEL: Record<string, string> = {
  CREATE: "Criado",
  UPDATE: "Alterado",
  DELETE: "Eliminado",
};

export function TransactionAuditPanel({
  createdBy,
  createdAt,
  updatedBy,
  updatedAt,
  audits,
}: {
  createdBy: string;
  createdAt: Date;
  updatedBy?: string | null;
  updatedAt: Date;
  audits: AuditRow[];
}) {
  const wasEdited =
    Boolean(updatedBy) &&
    (updatedAt.getTime() - createdAt.getTime() > 1000 ||
      audits.some((a) => a.action === "UPDATE"));

  return (
    <div className="audit-meta">
      <dl className="audit-dl">
        <div>
          <dt>Criado por</dt>
          <dd>{createdBy}</dd>
        </div>
        <div>
          <dt>Criado em</dt>
          <dd>{formatAuditWhen(createdAt)}</dd>
        </div>
        {wasEdited ? (
          <>
            <div>
              <dt>Última alteração</dt>
              <dd>{updatedBy}</dd>
            </div>
            <div>
              <dt>Alterado em</dt>
              <dd>{formatAuditWhen(updatedAt)}</dd>
            </div>
          </>
        ) : null}
      </dl>
      {audits.length > 1 ? (
        <div className="audit-timeline">
          <p className="muted small" style={{ marginBottom: "0.4rem" }}>
            Histórico
          </p>
          <ul>
            {audits.map((a) => (
              <li key={a.id}>
                <strong>{ACTION_LABEL[a.action] ?? a.action}</strong> · {a.actorDisplayName}
                <span className="muted small"> · {formatAuditWhen(a.createdAt)}</span>
                {a.summary ? <div className="muted small">{a.summary}</div> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
