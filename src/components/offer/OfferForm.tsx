"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createOfferAction } from "@/actions/marketplace";

type Vehicle = {
  id: string;
  make: string;
  model: string;
  category: string;
};

export function OfferForm({
  tripRequestId,
  vehicles,
  existingPrice,
}: {
  tripRequestId: string;
  vehicles: Vehicle[];
  existingPrice?: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("tripRequestId", tripRequestId);
    const result = await createOfferAction(formData);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (vehicles.length === 0) {
    return (
      <div className="alert alert-error">
        Regista um veículo em <a href="/veiculo">/veiculo</a> antes de propor.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="panel" style={{ marginTop: "0.75rem" }}>
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
          defaultValue={existingPrice}
          required
        />
      </div>
      <div className="field">
        <label className="label" htmlFor="vehicleId">
          Veículo
        </label>
        <select className="select" id="vehicleId" name="vehicleId" defaultValue={vehicles[0]?.id}>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.make} {v.model} ({v.category})
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="label" htmlFor="message">
          Mensagem
        </label>
        <textarea className="textarea" id="message" name="message" placeholder="Inclui portagens, espera…" />
      </div>
      <label className="muted" style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <input type="checkbox" name="includesTolls" defaultChecked /> Inclui portagens
      </label>
      <label className="muted" style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input type="checkbox" name="includesWaiting" /> Inclui tempo de espera
      </label>
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "A enviar…" : existingPrice ? "Atualizar proposta" : "Enviar proposta"}
      </button>
    </form>
  );
}
