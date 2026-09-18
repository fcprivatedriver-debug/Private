"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createOfferAction } from "@/actions/marketplace";
import { formatMoney } from "@/lib/money";

type Vehicle = {
  id: string;
  make: string;
  model: string;
  className: string;
};

export function OfferForm({
  tripRequestId,
  vehicles,
  existingPrice,
  existingEta,
  routeLabel,
}: {
  tripRequestId: string;
  vehicles: Vehicle[];
  existingPrice?: number;
  existingEta?: number | null;
  routeLabel?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "confirm" | "done">("form");
  const [draft, setDraft] = useState<{
    priceEuros: string;
    estimatedArrivalMinutes: string;
    vehicleId: string;
    message: string;
    includesTolls: boolean;
    includesWaiting: boolean;
  } | null>(null);

  function onContinue(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const priceEuros = String(fd.get("priceEuros") || "");
    if (!priceEuros || Number(priceEuros) <= 0) {
      setError("Indique um preço válido.");
      return;
    }
    setDraft({
      priceEuros,
      estimatedArrivalMinutes: String(fd.get("estimatedArrivalMinutes") || "25"),
      vehicleId: String(fd.get("vehicleId") || vehicles[0]?.id || ""),
      message: String(fd.get("message") || ""),
      includesTolls: fd.get("includesTolls") === "on",
      includesWaiting: fd.get("includesWaiting") === "on",
    });
    setStep("confirm");
  }

  async function onConfirm() {
    if (!draft) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.set("tripRequestId", tripRequestId);
    formData.set("priceEuros", draft.priceEuros);
    formData.set("estimatedArrivalMinutes", draft.estimatedArrivalMinutes);
    formData.set("vehicleId", draft.vehicleId);
    if (draft.message) formData.set("message", draft.message);
    if (draft.includesTolls) formData.set("includesTolls", "on");
    if (draft.includesWaiting) formData.set("includesWaiting", "on");
    const result = await createOfferAction(formData);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      setStep("form");
      return;
    }
    setStep("done");
    router.refresh();
  }

  if (vehicles.length === 0) {
    return (
      <div className="alert alert-error">
        Registe um veículo em <Link href="/veiculo">/veiculo</Link> antes de propor.
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="panel" style={{ marginTop: "0.75rem" }}>
        <div className="alert alert-info" style={{ marginBottom: "0.75rem" }}>
          Proposta enviada. O cliente foi notificado.
        </div>
        <div className="cta-row">
          <Link href="/propostas" className="btn btn-primary btn-sm">
            Ver as minhas propostas
          </Link>
          <Link href="/pedidos-abertos" className="btn btn-ghost btn-sm">
            Voltar aos pedidos
          </Link>
        </div>
      </div>
    );
  }

  if (step === "confirm" && draft) {
    const cents = Math.round(Number(draft.priceEuros) * 100);
    return (
      <div className="panel" style={{ marginTop: "0.75rem" }}>
        {error && <div className="alert alert-error">{error}</div>}
        <h2 className="font-display" style={{ fontSize: "1.2rem", marginTop: 0 }}>
          Confirmar proposta
        </h2>
        {routeLabel && <p className="muted">{routeLabel}</p>}
        <p>
          <strong>Preço proposto: {formatMoney(cents)}</strong>
        </p>
        <div className="cta-row">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={loading}
            onClick={() => setStep("form")}
          >
            Voltar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading}
            onClick={() => void onConfirm()}
          >
            {loading ? "A enviar…" : "Enviar proposta"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onContinue} className="panel" style={{ marginTop: "0.75rem" }}>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="field">
        <label className="label" htmlFor="priceEuros">
          Preço total (EUR)
        </label>
        <input
          className="input"
          id="priceEuros"
          name="priceEuros"
          type="number"
          min={1}
          step="0.01"
          defaultValue={draft?.priceEuros ?? existingPrice}
          required
        />
      </div>
      <div className="field">
        <label className="label" htmlFor="estimatedArrivalMinutes">
          Chegada estimada (minutos)
        </label>
        <input
          className="input"
          id="estimatedArrivalMinutes"
          name="estimatedArrivalMinutes"
          type="number"
          min={1}
          max={240}
          defaultValue={draft?.estimatedArrivalMinutes ?? existingEta ?? 25}
          required
        />
      </div>
      <div className="field">
        <label className="label" htmlFor="vehicleId">
          Veículo
        </label>
        <select
          className="select"
          id="vehicleId"
          name="vehicleId"
          defaultValue={draft?.vehicleId ?? vehicles[0]?.id}
        >
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.make} {v.model} ({v.className})
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="label" htmlFor="message">
          Mensagem (opcional)
        </label>
        <textarea
          className="textarea"
          id="message"
          name="message"
          defaultValue={draft?.message}
          placeholder="Portagens, espera, ponto de encontro, bagagem…"
        />
        <p className="muted" style={{ fontSize: "0.8rem", margin: "0.35rem 0 0" }}>
          Não partilhe telefone, email ou redes — os contactos abrem só após a reserva
          confirmada.
        </p>
      </div>
      <label className="muted" style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <input
          type="checkbox"
          name="includesTolls"
          defaultChecked={draft?.includesTolls ?? true}
        />{" "}
        Inclui portagens
      </label>
      <label className="muted" style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input
          type="checkbox"
          name="includesWaiting"
          defaultChecked={draft?.includesWaiting ?? false}
        />{" "}
        Inclui tempo de espera
      </label>
      <button className="btn btn-primary" type="submit">
        {existingPrice ? "Rever proposta" : "Fazer proposta"}
      </button>
    </form>
  );
}
