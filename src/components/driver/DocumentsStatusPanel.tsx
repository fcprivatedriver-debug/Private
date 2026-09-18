import { Link } from "@/i18n/navigation";
import {
  DRIVER_DOCUMENT_TYPE_LABELS,
  DRIVER_DOCUMENT_STATUS_LABELS,
} from "@/config/constants";
import { REQUIRED_DOC_TYPES, OPTIONAL_DOC_TYPES } from "@/domain/onboarding";

type DocRow = {
  type: string;
  status: string;
  reviewedAt?: Date | string | null;
  createdAt?: Date | string | null;
};

type DocRequirement = {
  type: string;
  optional?: boolean;
};

function statusTone(status: string | "MISSING"): string {
  if (status === "APPROVED" || status === "AI_PASSED") return "ok";
  if (status === "REJECTED" || status === "AI_FLAGGED") return "bad";
  if (status === "MISSING") return "warn";
  return "pending";
}

function statusIcon(tone: string): string {
  if (tone === "ok") return "✓";
  if (tone === "bad") return "✗";
  if (tone === "warn") return "⚠";
  return "•";
}

/**
 * Documents & verification panel driven by real DriverDocument rows + required types.
 */
export function DocumentsStatusPanel({
  docs,
  onboardingStatus,
  driverStatus,
}: {
  docs: DocRow[];
  onboardingStatus?: string;
  driverStatus?: string;
}) {
  const byType = new Map<string, DocRow>();
  for (const d of docs) {
    const prev = byType.get(d.type);
    if (!prev) {
      byType.set(d.type, d);
      continue;
    }
    // Prefer most recent
    const prevAt = new Date(prev.createdAt || 0).getTime();
    const nextAt = new Date(d.createdAt || 0).getTime();
    if (nextAt >= prevAt) byType.set(d.type, d);
  }

  const requirements: DocRequirement[] = [
    ...REQUIRED_DOC_TYPES.map((type) => ({ type })),
    ...OPTIONAL_DOC_TYPES.map((type) => ({ type, optional: true })),
  ];

  // Also surface any uploaded types not in the required list (e.g. INSURANCE)
  for (const type of byType.keys()) {
    if (!requirements.some((r) => r.type === type)) {
      requirements.push({ type, optional: true });
    }
  }

  const missingRequired = REQUIRED_DOC_TYPES.filter((t) => {
    const row = byType.get(t);
    return !row || !["APPROVED", "AI_PASSED"].includes(row.status);
  });

  const needsOnboarding =
    driverStatus !== "ACTIVE" ||
    (onboardingStatus && !["APPROVED"].includes(onboardingStatus));

  return (
    <div className="docs-panel panel">
      <div className="page-head" style={{ marginBottom: "0.75rem" }}>
        <div>
          <h2 className="font-display" style={{ fontSize: "1.25rem", margin: 0 }}>
            Documentos e verificação
          </h2>
          <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.9rem" }}>
            {driverStatus === "ACTIVE"
              ? "Perfil aprovado — pode enviar propostas."
              : "Conclua a verificação para poder enviar propostas."}
          </p>
        </div>
        <Link href="/onboarding" className="btn btn-secondary btn-sm">
          Abrir onboarding
        </Link>
      </div>

      <ul className="docs-list">
        {requirements.map((req) => {
          const row = byType.get(req.type);
          const statusKey = row ? row.status : "MISSING";
          const tone = statusTone(statusKey);
          const label =
            DRIVER_DOCUMENT_TYPE_LABELS[req.type] || req.type.replaceAll("_", " ");
          const statusLabel =
            statusKey === "MISSING"
              ? req.optional
                ? "Opcional · em falta"
                : DRIVER_DOCUMENT_STATUS_LABELS.MISSING
              : DRIVER_DOCUMENT_STATUS_LABELS[statusKey] || statusKey;

          return (
            <li key={req.type} className={`docs-item docs-${tone}`}>
              <Link href="/onboarding" className="docs-item-link">
                <span className="docs-icon" aria-hidden>
                  {statusIcon(tone)}
                </span>
                <span className="docs-text">
                  <strong>{label}</strong>
                  <span className="muted">{statusLabel}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {needsOnboarding && missingRequired.length > 0 && (
        <p className="alert alert-info" style={{ marginBottom: 0, marginTop: "0.85rem" }}>
          Faltam documentos obrigatórios ou aprovação. Toque num item para continuar o
          onboarding.
        </p>
      )}
    </div>
  );
}
