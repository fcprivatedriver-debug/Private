"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createTripAction } from "@/actions/marketplace";
import { AddressAutocompleteInput } from "@/components/map/AddressAutocompleteInput";
import { useLocale } from "next-intl";

type VehicleClassOption = {
  id: string;
  code: string;
  name: string;
  maxPassengers: number;
  maxLuggage: number;
};

export default function NewTripPage() {
  const router = useRouter();
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<VehicleClassOption[]>([]);

  useEffect(() => {
    fetch(`/api/vehicle-classes?locale=${locale}`)
      .then((r) => r.json())
      .then((data) => setClasses(data.classes || []))
      .catch(() => setClasses([]));
  }, [locale]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("publish", "true");
    const preferred = String(formData.get("preferredVehicleClassId") || "");
    if (!preferred) formData.delete("preferredVehicleClassId");
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
          <AddressAutocompleteInput
            name="pickupAddress"
            label="Origem"
            placeholder="Aeroporto de Lisboa (LIS)"
            required
          />
          <AddressAutocompleteInput
            name="dropoffAddress"
            label="Destino"
            placeholder="Hotel ou morada"
            required
          />
          <div className="grid-2">
            <div className="field">
              <label className="label" htmlFor="pickupAt">
                Data e hora
              </label>
              <input className="input" id="pickupAt" name="pickupAt" type="datetime-local" required />
            </div>
            <div className="field">
              <label className="label" htmlFor="preferredVehicleClassId">
                Classe de veículo preferida
              </label>
              <select className="select" id="preferredVehicleClassId" name="preferredVehicleClassId" defaultValue="">
                <option value="">Sem preferência</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · até {c.maxPassengers} pax / {c.maxLuggage} malas
                  </option>
                ))}
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
