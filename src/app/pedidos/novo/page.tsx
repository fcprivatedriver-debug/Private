"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createTripAction } from "@/actions/marketplace";

export default function NewTripPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("publish", "true");
    const result = await createTripAction(formData);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/pedidos/${result.tripId}`);
    router.refresh();
  }

  return (
    <section className="section fade-up">
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 className="font-display" style={{ fontSize: "2.4rem" }}>
          Novo pedido de viagem
        </h1>
        <p className="lead">Publica o trajeto e espera propostas de motoristas.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={onSubmit} className="panel">
          <div className="field">
            <label className="label" htmlFor="pickupAddress">
              Origem
            </label>
            <input
              className="input"
              id="pickupAddress"
              name="pickupAddress"
              placeholder="Aeroporto de Lisboa (LIS)"
              required
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="dropoffAddress">
              Destino
            </label>
            <input
              className="input"
              id="dropoffAddress"
              name="dropoffAddress"
              placeholder="Hotel ou morada"
              required
            />
          </div>
          <div className="grid-2">
            <div className="field">
              <label className="label" htmlFor="pickupAt">
                Data e hora
              </label>
              <input className="input" id="pickupAt" name="pickupAt" type="datetime-local" required />
            </div>
            <div className="field">
              <label className="label" htmlFor="preferredVehicleCategory">
                Veículo preferido
              </label>
              <select className="select" id="preferredVehicleCategory" name="preferredVehicleCategory">
                <option value="">Sem preferência</option>
                <option value="SEDAN">Sedan</option>
                <option value="EXECUTIVE">Executivo</option>
                <option value="VAN">Van</option>
                <option value="MINIBUS">Minibus</option>
                <option value="LUXURY">Luxo</option>
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label className="label" htmlFor="passengers">
                Passageiros
              </label>
              <input className="input" id="passengers" name="passengers" type="number" min={1} defaultValue={1} required />
            </div>
            <div className="field">
              <label className="label" htmlFor="luggage">
                Malas
              </label>
              <input className="input" id="luggage" name="luggage" type="number" min={0} defaultValue={1} required />
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="flightNumber">
              Nº de voo (opcional)
            </label>
            <input className="input" id="flightNumber" name="flightNumber" />
          </div>
          <div className="field">
            <label className="label" htmlFor="notes">
              Notas
            </label>
            <textarea className="textarea" id="notes" name="notes" placeholder="Placa com nome, tempo de espera…" />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "A publicar…" : "Publicar pedido"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
