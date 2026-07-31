"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  saveOnboardingProfileAction,
  setOnboardingStepAction,
  submitOnboardingAction,
  uploadDocumentAction,
} from "@/actions/onboarding";
import { upsertVehicleAction } from "@/actions/marketplace";
import { Link } from "@/i18n/navigation";
import { driverLifecycleLabel, VEHICLE_PHOTO_LABELS } from "@/config/constants";

type Doc = {
  id: string;
  type: string;
  status: string;
  fileName: string;
  url?: string | null;
  aiScore?: number | null;
};

type Vehicle = {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  plate: string;
  seats: number;
  luggageCapacity: number;
  vehicleClassId: string;
  photoUrls?: string | null;
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
  vehicles: Vehicle[];
  verificationDocs: Doc[];
  user?: { name: string; email: string; phone: string | null };
};

const DOC_TYPES = [
  { type: "IDENTITY", label: "Documento de Identificação (CC ou equivalente)", required: true },
  { type: "DRIVING_LICENSE", label: "Carta de Condução", required: true },
  { type: "TVDE_CERTIFICATE", label: "Certificado TVDE", required: true },
  { type: "CMTVDE_LICENSE", label: "Licença / CMTVDE (se aplicável)", required: false },
  { type: "CRIMINAL_RECORD", label: "Registo Criminal", required: true },
] as const;

const PHOTO_KEYS = [
  "front",
  "rear",
  "left",
  "right",
  "interiorFront",
  "interiorRear",
  "trunk",
  "video",
] as const;

const STEPS = [
  { id: "profile", label: "1 · Dados" },
  { id: "documents", label: "2 · Documentos" },
  { id: "vehicle", label: "3 · Veículo" },
  { id: "photos", label: "4 · Fotografias" },
  { id: "review", label: "Validação" },
] as const;

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

export function OnboardingWizard({
  profile,
  vehicleClasses,
}: {
  profile: Profile;
  vehicleClasses: { id: string; code: string; name: string }[];
}) {
  const router = useRouter();
  const initialStep =
    profile.onboardingStep === "review" ? "review" : profile.onboardingStep || "profile";
  const [step, setStep] = useState(initialStep === "documents" ? "documents" : initialStep);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<Record<string, string>>(
    parsePhotos(profile.vehicles[0]?.photoUrls),
  );

  const locked =
    profile.onboardingStatus === "SUBMITTED" ||
    profile.onboardingStatus === "UNDER_REVIEW" ||
    profile.onboardingStatus === "APPROVED" ||
    profile.status === "ACTIVE";

  const lifecycle = useMemo(
    () =>
      driverLifecycleLabel({
        status: profile.status,
        onboardingStatus: profile.onboardingStatus,
        completenessScore: profile.completenessScore,
      }),
    [profile],
  );

  async function go(next: string) {
    setStep(next);
    const persisted =
      next === "photos" ? "vehicle" : next === "review" ? "review" : next;
    if (!locked && ["profile", "vehicle", "documents", "review"].includes(persisted)) {
      await setOnboardingStepAction(persisted as "profile" | "vehicle" | "documents" | "review");
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
    setOk("Dados guardados.");
    router.refresh();
    await go("documents");
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
    setOk("Documento carregado.");
    router.refresh();
  }

  async function onSaveVehicle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("photoUrls", JSON.stringify(photos));
    const result = await upsertVehicleAction(fd);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOk("Veículo guardado.");
    router.refresh();
    await go("photos");
  }

  async function onUploadPhoto(key: string, file: File) {
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("photoKey", key);
    const result = await uploadDocumentAction(fd);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if ("url" in result && result.url) {
      setPhotos((prev) => ({ ...prev, [key]: result.url as string }));
    }
    setOk(`Fotografia «${VEHICLE_PHOTO_LABELS[key] || key}» carregada.`);
    router.refresh();
  }

  async function onSubmit() {
    setLoading(true);
    setError(null);
    // ensure photos persisted
    const v = profile.vehicles[0];
    if (v) {
      const vehicleFd = new FormData();
      vehicleFd.set("make", v.make);
      vehicleFd.set("model", v.model);
      vehicleFd.set("year", String(v.year));
      vehicleFd.set("color", v.color);
      vehicleFd.set("plate", v.plate);
      vehicleFd.set("seats", String(v.seats));
      vehicleFd.set("luggageCapacity", String(v.luggageCapacity));
      vehicleFd.set("vehicleClassId", v.vehicleClassId);
      vehicleFd.set("photoUrls", JSON.stringify(photos));
      await upsertVehicleAction(vehicleFd);
    }
    const result = await submitOnboardingAction();
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOk(
      result.recommendation === "APPROVE"
        ? "Análise concluída. Perfil aprovado ou pronto para ativação."
        : "Candidatura enviada. A IA analisou os ficheiros — aguarde validação.",
    );
    router.refresh();
    await go("review");
  }

  const vehicle = profile.vehicles[0];

  return (
    <div className="fade-up">
      <div style={{ marginBottom: "1.5rem", paddingBottom: "1.25rem", borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <div className="muted">Progresso</div>
            <strong className="font-display" style={{ fontSize: "1.85rem" }}>
              {profile.completenessScore}%
            </strong>
          </div>
          <div>
            <div className="muted">Estado</div>
            <span className="badge">{lifecycle}</span>
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
              width: `${profile.completenessScore}%`,
              height: "100%",
              background: "var(--brand)",
              transition: "width 0.45s ease",
            }}
          />
        </div>
      </div>

      <div className="cta-row" style={{ marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={step === s.id ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
            onClick={() => go(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {ok && <div className="alert alert-info">{ok}</div>}
      {profile.infoRequestMessage && (
        <div className="alert alert-error">Pedido da equipa: {profile.infoRequestMessage}</div>
      )}
      {profile.rejectionReason && (
        <div className="alert alert-error">Motivo da rejeição: {profile.rejectionReason}</div>
      )}

      {step === "profile" && (
        <form onSubmit={onSaveProfile} className="panel">
          <h2 className="font-display" style={{ marginTop: 0 }}>
            Dados pessoais
          </h2>
          <div className="field">
            <label className="label" htmlFor="name">Nome</label>
            <input className="input" id="name" name="name" defaultValue={profile.user?.name || ""} required disabled={locked} />
          </div>
          <div className="field">
            <label className="label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" defaultValue={profile.user?.email || ""} required disabled />
          </div>
          <div className="field">
            <label className="label" htmlFor="phone">Telefone</label>
            <input className="input" id="phone" name="phone" defaultValue={profile.user?.phone || ""} required disabled={locked} />
          </div>
          <div className="field">
            <label className="label" htmlFor="bio">Breve apresentação</label>
            <textarea className="textarea" id="bio" name="bio" defaultValue={profile.bio || ""} disabled={locked} required />
          </div>
          <div className="grid-2">
            <div className="field">
              <label className="label" htmlFor="yearsOfExperience">Anos de experiência</label>
              <input className="input" id="yearsOfExperience" name="yearsOfExperience" type="number" min={0} defaultValue={profile.yearsOfExperience} disabled={locked} />
            </div>
            <div className="field">
              <label className="label" htmlFor="languagesSpoken">Idiomas</label>
              <input className="input" id="languagesSpoken" name="languagesSpoken" defaultValue="pt" disabled={locked} />
            </div>
          </div>
          {!locked && (
            <button className="btn btn-primary" type="submit" disabled={loading}>
              Guardar e continuar
            </button>
          )}
        </form>
      )}

      {step === "documents" && (
        <div className="panel">
          <h2 className="font-display" style={{ marginTop: 0 }}>Documentos obrigatórios</h2>
          <p className="muted">JPG, PNG, WebP ou PDF · máx. 10MB. A IA valida legibilidade e coerência.</p>
          <div className="list-stack" style={{ marginTop: "1rem" }}>
            {DOC_TYPES.map((d) => {
              const existing = profile.verificationDocs.find((x) => x.type === d.type);
              return (
                <div key={d.type} className="list-item">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                    <strong>{d.label}{d.required ? " *" : ""}</strong>
                    <span className="badge">{existing ? existing.status : "Em falta"}</span>
                  </div>
                  {existing && (
                    <div className="muted">
                      {existing.fileName}
                      {existing.aiScore != null ? ` · IA ${existing.aiScore}` : ""}
                      {existing.url ? <> · <a href={existing.url} target="_blank" rel="noreferrer">Ver</a></> : null}
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
              <button type="button" className="btn btn-primary" onClick={() => go("vehicle")}>
                Continuar
              </button>
            </div>
          )}
        </div>
      )}

      {step === "vehicle" && (
        <form onSubmit={onSaveVehicle} className="panel">
          <h2 className="font-display" style={{ marginTop: 0 }}>Dados do veículo</h2>
          <div className="grid-2">
            <div className="field">
              <label className="label" htmlFor="make">Marca</label>
              <input className="input" id="make" name="make" defaultValue={vehicle?.make} required disabled={locked} />
            </div>
            <div className="field">
              <label className="label" htmlFor="model">Modelo</label>
              <input className="input" id="model" name="model" defaultValue={vehicle?.model} required disabled={locked} />
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label className="label" htmlFor="year">Ano</label>
              <input className="input" id="year" name="year" type="number" defaultValue={vehicle?.year || 2020} required disabled={locked} />
            </div>
            <div className="field">
              <label className="label" htmlFor="plate">Matrícula</label>
              <input className="input" id="plate" name="plate" defaultValue={vehicle?.plate} required disabled={locked} />
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label className="label" htmlFor="color">Cor</label>
              <input className="input" id="color" name="color" defaultValue={vehicle?.color} required disabled={locked} />
            </div>
            <div className="field">
              <label className="label" htmlFor="vehicleClassId">Categoria</label>
              <select className="input" id="vehicleClassId" name="vehicleClassId" defaultValue={vehicle?.vehicleClassId || vehicleClasses[0]?.id} required disabled={locked}>
                {vehicleClasses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <input type="hidden" name="seats" value={vehicle?.seats || 4} />
          <input type="hidden" name="luggageCapacity" value={vehicle?.luggageCapacity || 3} />
          {!locked && (
            <button className="btn btn-primary" type="submit" disabled={loading}>
              Guardar e continuar
            </button>
          )}
        </form>
      )}

      {step === "photos" && (
        <div className="panel">
          <h2 className="font-display" style={{ marginTop: 0 }}>Fotografias do veículo</h2>
          <p className="muted">Obrigatórias: frente, traseira, lados, interiores e bagageira. Vídeo opcional.</p>
          {!vehicle && <p className="alert alert-error">Guarde primeiro os dados do veículo (passo 3).</p>}
          <div className="list-stack" style={{ marginTop: "1rem" }}>
            {PHOTO_KEYS.map((key) => (
              <div key={key} className="list-item">
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <strong>{VEHICLE_PHOTO_LABELS[key] || key}{key === "video" ? "" : " *"}</strong>
                  <span className="badge">{photos[key] ? "Carregada" : "Em falta"}</span>
                </div>
                {!locked && vehicle && (
                  <input
                    type="file"
                    accept={key === "video" ? "video/*" : "image/*"}
                    style={{ marginTop: "0.5rem" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void onUploadPhoto(key, file);
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          {!locked && (
            <div className="form-actions" style={{ marginTop: "1rem" }}>
              <button type="button" className="btn btn-primary" onClick={() => go("review")}>
                Continuar para validação
              </button>
            </div>
          )}
        </div>
      )}

      {step === "review" && (
        <div className="panel">
          <h2 className="font-display" style={{ marginTop: 0 }}>Validação por IA</h2>
          <p className="muted">
            A IA analisa documentos e fotografias (legibilidade, validade aparente, qualidade e
            coerência). Resultado: APROVADO, PENDENTE ou REJEITADO. A equipa pode validar manualmente.
          </p>
          {profile.aiSummary && (
            <div className="alert alert-info" style={{ marginTop: "1rem" }}>
              {profile.aiSummary}
              {profile.aiRiskScore != null ? ` · risco ${profile.aiRiskScore}/100` : ""}
            </div>
          )}
          {!locked && (
            <button className="btn btn-primary" type="button" disabled={loading} onClick={onSubmit}>
              {loading ? "A analisar…" : "Enviar para análise"}
            </button>
          )}
          {locked && profile.status !== "ACTIVE" && (
            <p className="muted" style={{ marginTop: "1rem" }}>
              Candidatura em {lifecycle.toLowerCase()}. Motivo de rejeição (se existir) aparece acima.
            </p>
          )}
          {profile.status === "ACTIVE" && (
            <Link href="/painel" className="btn btn-primary" style={{ marginTop: "1rem" }}>
              Ir para o painel
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
