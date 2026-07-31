"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminVerificationAction,
  rerunAiVerificationAction,
} from "@/actions/onboarding";
import { driverLifecycleLabel } from "@/config/constants";

export type QueueItem = {
  id: string;
  status: string;
  onboardingStatus: string;
  completenessScore: number;
  aiRiskScore: number | null;
  aiConfidence: number | null;
  aiSummary: string | null;
  rejectionReason?: string | null;
  submittedAt: string | Date | null;
  user: { name: string; email: string; phone: string | null };
  vehicles: { make: string; model: string; plate: string; photoUrls?: string | null }[];
  verificationDocs: {
    id: string;
    type: string;
    status: string;
    fileName: string;
    url: string | null;
    aiScore: number | null;
  }[];
  verificationReviews: {
    id: string;
    source: string;
    decision: string | null;
    recommendation: string | null;
    riskScore: number | null;
  }[];
};

function parsePhotos(raw?: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {
    /* ignore */
  }
  return {};
}

export function VerificationQueue({ items }: { items: QueueItem[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function decide(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await adminVerificationAction(new FormData(e.currentTarget));
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (items.length === 0) {
    return <div className="empty-state">Nenhum motorista à espera de validação.</div>;
  }

  return (
    <div className="list-stack">
      {error && <div className="alert alert-error">{error}</div>}
      {items.map((item) => {
        const photos = parsePhotos(item.vehicles[0]?.photoUrls);
        const lifecycle = driverLifecycleLabel({
          status: item.status,
          onboardingStatus: item.onboardingStatus,
          completenessScore: item.completenessScore,
        });
        return (
          <article key={item.id} className="list-item">
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <strong>{item.user.name}</strong>
                <div className="muted">
                  {item.user.email}
                  {item.user.phone ? ` · ${item.user.phone}` : ""}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className="badge">
                  {lifecycle} · risco {item.aiRiskScore ?? "—"}
                </span>
                <div className="muted">completude {item.completenessScore}%</div>
              </div>
            </div>

            {item.aiSummary && (
              <div className="alert alert-info" style={{ marginTop: "0.75rem", marginBottom: 0 }}>
                {item.aiSummary}
                {item.aiConfidence != null ? ` · confiança ${item.aiConfidence}%` : ""}
              </div>
            )}
            {item.rejectionReason && (
              <div className="alert alert-error" style={{ marginTop: "0.75rem" }}>
                Motivo: {item.rejectionReason}
              </div>
            )}

            <div className="muted" style={{ marginTop: "0.75rem" }}>
              Veículo:{" "}
              {item.vehicles[0]
                ? `${item.vehicles[0].make} ${item.vehicles[0].model} · ${item.vehicles[0].plate}`
                : "—"}
            </div>

            <div className="list-stack" style={{ marginTop: "0.75rem" }}>
              <strong>Documentos</strong>
              {item.verificationDocs.map((doc) => (
                <div key={doc.id} className="muted">
                  {doc.type}: {doc.fileName} · {doc.status}
                  {doc.aiScore != null ? ` · IA ${doc.aiScore}` : ""}
                  {doc.url ? (
                    <>
                      {" · "}
                      <a href={doc.url} target="_blank" rel="noreferrer">
                        Abrir
                      </a>
                    </>
                  ) : null}
                </div>
              ))}
            </div>

            {Object.keys(photos).length > 0 && (
              <div className="list-stack" style={{ marginTop: "0.75rem" }}>
                <strong>Fotografias</strong>
                {Object.entries(photos).map(([key, url]) => (
                  <div key={key} className="muted">
                    {key}:{" "}
                    <a href={url} target="_blank" rel="noreferrer">
                      Ver
                    </a>
                  </div>
                ))}
              </div>
            )}

            {item.verificationReviews[0] && (
              <div className="muted" style={{ marginTop: "0.5rem" }}>
                Última revisão ({item.verificationReviews[0].source}):{" "}
                {item.verificationReviews[0].decision || "—"} —{" "}
                {item.verificationReviews[0].recommendation}
              </div>
            )}

            <form onSubmit={decide} className="panel" style={{ marginTop: "0.85rem" }}>
              <input type="hidden" name="driverProfileId" value={item.id} />
              <div className="field">
                <label className="label" htmlFor={`notes-${item.id}`}>
                  Notas / motivo (obrigatório para rejeitar)
                </label>
                <textarea className="textarea" id={`notes-${item.id}`} name="notes" />
              </div>
              <div className="form-actions">
                <button className="btn btn-primary" name="decision" value="APPROVE" type="submit" disabled={loading}>
                  Aprovar
                </button>
                <button className="btn btn-secondary" name="decision" value="REQUEST_INFO" type="submit" disabled={loading}>
                  Pedir documentos
                </button>
                <button className="btn btn-danger" name="decision" value="REJECT" type="submit" disabled={loading}>
                  Rejeitar
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    await rerunAiVerificationAction(item.id);
                    setLoading(false);
                    router.refresh();
                  }}
                >
                  Voltar a correr IA
                </button>
              </div>
            </form>
          </article>
        );
      })}
    </div>
  );
}
