"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  saveOnboardingProfileAction,
  setOnboardingStepAction,
  submitOnboardingAction,
  uploadDocumentAction,
} from "@/actions/onboarding";
import { Link } from "@/i18n/navigation";

type Doc = {
  id: string;
  type: string;
  status: string;
  fileName: string;
  url?: string | null;
  aiScore?: number | null;
};

type Profile = {
  id: string;
  bio: string | null;
  photoUrl: string | null;
  languagesSpoken: string;
  yearsOfExperience: number;
  completenessScore: number;
  onboardingStatus: string;
  onboardingStep: string;
  status: string;
  aiRiskScore: number | null;
  aiSummary: string | null;
  rejectionReason: string | null;
  infoRequestMessage: string | null;
  vehicles: { id: string; make: string; model: string; plate: string }[];
  verificationDocs: Doc[];
};

const DOC_TYPES = [
  { type: "IDENTITY", label: "Identity document" },
  { type: "DRIVING_LICENSE", label: "Driving licence" },
  { type: "VEHICLE_REGISTRATION", label: "Vehicle registration" },
  { type: "INSURANCE", label: "Insurance" },
  { type: "PROFILE_PHOTO", label: "Profile photo (file)" },
] as const;

const STEPS = [
  { id: "profile", label: "Profile" },
  { id: "vehicle", label: "Vehicle" },
  { id: "documents", label: "Documents" },
  { id: "review", label: "AI review" },
] as const;

function parseLanguages(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.join(", ");
  } catch {
    // ignore
  }
  return raw;
}

export function OnboardingWizard({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [step, setStep] = useState(profile.onboardingStep || "profile");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const locked =
    profile.onboardingStatus === "SUBMITTED" ||
    profile.onboardingStatus === "UNDER_REVIEW" ||
    profile.status === "ACTIVE";

  const progress = useMemo(() => profile.completenessScore, [profile.completenessScore]);

  async function go(next: string) {
    setStep(next);
    if (!locked && ["profile", "vehicle", "documents", "review"].includes(next)) {
      await setOnboardingStepAction(next as "profile" | "vehicle" | "documents" | "review");
    }
  }

  async function onSaveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOk(null);
    const result = await saveOnboardingProfileAction(new FormData(e.currentTarget));
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOk("Profile saved");
    router.refresh();
    await go("vehicle");
  }

  async function onUpload(type: string, file: File) {
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("type", type);
    fd.set("file", file);
    const result = await uploadDocumentAction(fd);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOk(`${type} uploaded`);
    router.refresh();
  }

  async function onSubmit() {
    setLoading(true);
    setError(null);
    const result = await submitOnboardingAction();
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOk(
      `Submitted — AI recommendation: ${result.recommendation} (risk ${result.riskScore})`,
    );
    router.refresh();
    await go("review");
  }

  return (
    <div className="fade-up">
      <div style={{ marginBottom: "1.5rem", paddingBottom: "1.25rem", borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <div className="muted">Completeness</div>
            <strong className="font-display" style={{ fontSize: "1.85rem" }}>
              {progress}%
            </strong>
          </div>
          <div>
            <div className="muted">Status</div>
            <span className="badge">
              {profile.onboardingStatus} · {profile.status}
            </span>
          </div>
        </div>
        <div
          style={{
            marginTop: "0.85rem",
            height: 3,
            borderRadius: 2,
            background: "rgba(18, 22, 26, 0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "var(--brand)",
              transition: "width 0.45s ease",
            }}
          />
        </div>
      </div>

      <div className="cta-row" style={{ marginBottom: "1.25rem" }}>
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={step === s.id ? "btn btn-primary" : "btn btn-ghost"}
            onClick={() => go(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {ok && <div className="alert alert-info">{ok}</div>}
      {profile.infoRequestMessage && (
        <div className="alert alert-error">Admin request: {profile.infoRequestMessage}</div>
      )}
      {profile.rejectionReason && (
        <div className="alert alert-error">Rejection: {profile.rejectionReason}</div>
      )}

      {step === "profile" && (
        <form onSubmit={onSaveProfile} className="panel">
          <h2 className="font-display" style={{ marginTop: 0 }}>
            Professional profile
          </h2>
          <div className="field">
            <label className="label" htmlFor="photoUrl">
              Profile photo URL
            </label>
            <input
              className="input"
              id="photoUrl"
              name="photoUrl"
              defaultValue={profile.photoUrl || ""}
              placeholder="https://..."
              disabled={locked}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="bio">
              Biography
            </label>
            <textarea
              className="textarea"
              id="bio"
              name="bio"
              defaultValue={profile.bio || ""}
              placeholder="Tell customers about your experience..."
              disabled={locked}
              required
            />
          </div>
          <div className="grid-2">
            <div className="field">
              <label className="label" htmlFor="yearsOfExperience">
                Years of experience
              </label>
              <input
                className="input"
                id="yearsOfExperience"
                name="yearsOfExperience"
                type="number"
                min={0}
                defaultValue={profile.yearsOfExperience}
                disabled={locked}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="languagesSpoken">
                Languages (comma-separated)
              </label>
              <input
                className="input"
                id="languagesSpoken"
                name="languagesSpoken"
                defaultValue={parseLanguages(profile.languagesSpoken)}
                disabled={locked}
              />
            </div>
          </div>
          {!locked && (
            <button className="btn btn-primary" type="submit" disabled={loading}>
              Save & continue
            </button>
          )}
        </form>
      )}

      {step === "vehicle" && (
        <div className="panel">
          <h2 className="font-display" style={{ marginTop: 0 }}>
            Vehicle
          </h2>
          {profile.vehicles[0] ? (
            <p>
              {profile.vehicles[0].make} {profile.vehicles[0].model} · {profile.vehicles[0].plate}
            </p>
          ) : (
            <p className="muted">No vehicle yet. Register one to continue.</p>
          )}
          <div className="form-actions">
            <Link href="/veiculo" className="btn btn-secondary">
              Manage vehicle
            </Link>
            {!locked && (
              <button type="button" className="btn btn-primary" onClick={() => go("documents")}>
                Continue
              </button>
            )}
          </div>
        </div>
      )}

      {step === "documents" && (
        <div className="panel">
          <h2 className="font-display" style={{ marginTop: 0 }}>
            Verification documents
          </h2>
          <p className="muted">Upload clear scans or photos (JPG, PNG, WebP, PDF · max 10MB).</p>
          <div className="list-stack" style={{ marginTop: "1rem" }}>
            {DOC_TYPES.map((d) => {
              const existing = profile.verificationDocs.find((x) => x.type === d.type);
              return (
                <div key={d.type} className="list-item">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                    <strong>{d.label}</strong>
                    <span className="badge">{existing ? existing.status : "Missing"}</span>
                  </div>
                  {existing && (
                    <div className="muted">
                      {existing.fileName}
                      {existing.aiScore != null ? ` · AI score ${existing.aiScore}` : ""}
                      {existing.url ? (
                        <>
                          {" · "}
                          <a href={existing.url} target="_blank" rel="noreferrer">
                            View
                          </a>
                        </>
                      ) : null}
                    </div>
                  )}
                  {!locked && (
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      style={{ marginTop: "0.5rem" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void onUpload(d.type, file);
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          {!locked && (
            <div className="form-actions" style={{ marginTop: "1rem" }}>
              <button type="button" className="btn btn-primary" onClick={() => go("review")}>
                Continue to review
              </button>
            </div>
          )}
        </div>
      )}

      {step === "review" && (
        <div className="panel">
          <h2 className="font-display" style={{ marginTop: 0 }}>
            Submit for AI verification
          </h2>
          <p className="muted">
            ZRIK AI checks document quality, completeness, vehicle consistency and profile
            authenticity, then queues a human review.
          </p>
          {profile.aiSummary && (
            <div className="alert alert-info" style={{ marginTop: "1rem" }}>
              {profile.aiSummary}
              {profile.aiRiskScore != null ? ` · risk ${profile.aiRiskScore}/100` : ""}
            </div>
          )}
          {!locked && (
            <button className="btn btn-primary" type="button" disabled={loading} onClick={onSubmit}>
              {loading ? "Submitting…" : "Submit for verification"}
            </button>
          )}
          {locked && profile.status !== "ACTIVE" && (
            <p className="muted" style={{ marginTop: "1rem" }}>
              Your application is in the verification queue.
            </p>
          )}
          {profile.status === "ACTIVE" && (
            <Link href="/painel" className="btn btn-primary" style={{ marginTop: "1rem" }}>
              Go to dashboard
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
