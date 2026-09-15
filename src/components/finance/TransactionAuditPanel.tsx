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
  /** Conta Familiar (vários utilizadores): mostra quem criou/alterou. Conta Pessoal: só datas. */
  showActors = true,
}: {
  createdBy: string;
  createdAt: Date;
  updatedBy?: string | null;
  updatedAt: Date;
  audits: AuditRow[];
  showActors?: boolean;
}) {
  const lastBy = updatedBy?.trim() || createdBy;
  const lastAt = updatedAt ?? createdAt;

  return (
    <div className="audit-meta">
      <dl className="audit-dl">
        {showActors ? (
          <div>
            <dt>Criado por</dt>
            <dd>{createdBy}</dd>
          </div>
        ) : null}
        <div>
          <dt>Criado em</dt>
          <dd>{formatAuditWhen(createdAt)}</dd>
        </div>
        {showActors ? (
          <div>
            <dt>Última alteração por</dt>
            <dd>{lastBy}</dd>
          </div>
        ) : null}
        <div>
          <dt>Última alteração em</dt>
          <dd>{formatAuditWhen(lastAt)}</dd>
        </div>
      </dl>
      {showActors && audits.length > 1 ? (
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
      {!showActors && audits.length > 1 ? (
        <div className="audit-timeline">
          <p className="muted small" style={{ marginBottom: "0.4rem" }}>
            Histórico
          </p>
          <ul>
            {audits.map((a) => (
              <li key={a.id}>
                <strong>{ACTION_LABEL[a.action] ?? a.action}</strong>
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
