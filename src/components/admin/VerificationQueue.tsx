"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminVerificationAction,
  rerunAiVerificationAction,
} from "@/actions/onboarding";

export type QueueItem = {
  id: string;
  status: string;
  onboardingStatus: string;
  completenessScore: number;
  aiRiskScore: number | null;
  aiConfidence: number | null;
  aiSummary: string | null;
  submittedAt: string | Date | null;
  user: { name: string; email: string; phone: string | null };
  vehicles: { make: string; model: string; plate: string }[];
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
    return <div className="panel muted">No drivers awaiting verification.</div>;
  }

  return (
    <div className="list-stack">
      {error && <div className="alert alert-error">{error}</div>}
      {items.map((item) => (
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
                {item.onboardingStatus} · risk {item.aiRiskScore ?? "—"}
              </span>
              <div className="muted">completeness {item.completenessScore}%</div>
            </div>
          </div>

          {item.aiSummary && (
            <div className="alert alert-info" style={{ marginTop: "0.75rem", marginBottom: 0 }}>
              {item.aiSummary}
              {item.aiConfidence != null ? ` · confidence ${item.aiConfidence}%` : ""}
            </div>
          )}

          <div className="muted" style={{ marginTop: "0.75rem" }}>
            Vehicle:{" "}
            {item.vehicles[0]
              ? `${item.vehicles[0].make} ${item.vehicles[0].model} · ${item.vehicles[0].plate}`
              : "—"}
          </div>

          <div className="list-stack" style={{ marginTop: "0.75rem" }}>
            {item.verificationDocs.map((doc) => (
              <div key={doc.id} className="muted">
                {doc.type}: {doc.fileName} · {doc.status}
                {doc.aiScore != null ? ` · AI ${doc.aiScore}` : ""}
                {doc.url ? (
                  <>
                    {" · "}
                    <a href={doc.url} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  </>
                ) : null}
              </div>
            ))}
          </div>

          {item.verificationReviews[0] && (
            <div className="muted" style={{ marginTop: "0.5rem" }}>
              Last review ({item.verificationReviews[0].source}):{" "}
              {item.verificationReviews[0].decision || "—"} —{" "}
              {item.verificationReviews[0].recommendation}
            </div>
          )}

          <form onSubmit={decide} className="panel" style={{ marginTop: "0.85rem" }}>
            <input type="hidden" name="driverProfileId" value={item.id} />
            <div className="field">
              <label className="label" htmlFor={`notes-${item.id}`}>
                Notes
              </label>
              <textarea className="textarea" id={`notes-${item.id}`} name="notes" />
            </div>
            <div className="form-actions">
              <button
                className="btn btn-primary"
                name="decision"
                value="APPROVE"
                type="submit"
                disabled={loading}
              >
                Approve
              </button>
              <button
                className="btn btn-secondary"
                name="decision"
                value="REQUEST_INFO"
                type="submit"
                disabled={loading}
              >
                Request info
              </button>
              <button
                className="btn btn-danger"
                name="decision"
                value="REJECT"
                type="submit"
                disabled={loading}
              >
                Reject
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
                Re-run AI
              </button>
            </div>
          </form>
        </article>
      ))}
    </div>
  );
}
