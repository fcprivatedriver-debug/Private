"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { upsertVehicleAction } from "@/actions/marketplace";

type Vehicle = {
  make: string;
  model: string;
  year: number;
  color: string;
  plate: string;
  seats: number;
  luggageCapacity: number;
  vehicleClassId: string;
} | null;

type VehicleClassOption = {
  id: string;
  code: string;
  name: string;
  maxPassengers: number;
  maxLuggage: number;
};

export function VehicleForm({ vehicle }: { vehicle: Vehicle }) {
  const router = useRouter();
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
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
    setOk(false);
    const result = await upsertVehicleAction(new FormData(e.currentTarget));
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOk(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="panel">
      {error && <div className="alert alert-error">{error}</div>}
      {ok && <div className="alert alert-info">Veículo guardado.</div>}
      <div className="grid-2">
        <div className="field">
          <label className="label" htmlFor="make">
            Marca
          </label>
          <input className="input" id="make" name="make" defaultValue={vehicle?.make} required />
        </div>
        <div className="field">
          <label className="label" htmlFor="model">
            Modelo
          </label>
          <input className="input" id="model" name="model" defaultValue={vehicle?.model} required />
        </div>
      </div>
      <div className="grid-2">
        <div className="field">
          <label className="label" htmlFor="year">
            Ano
          </label>
          <input
            className="input"
            id="year"
            name="year"
            type="number"
            defaultValue={vehicle?.year || 2022}
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="color">
            Cor
          </label>
          <input className="input" id="color" name="color" defaultValue={vehicle?.color} required />
        </div>
      </div>
      <div className="grid-2">
        <div className="field">
          <label className="label" htmlFor="plate">
            Matrícula
          </label>
          <input className="input" id="plate" name="plate" defaultValue={vehicle?.plate} required />
        </div>
        <div className="field">
          <label className="label" htmlFor="vehicleClassId">
            Classe
          </label>
          <select
            className="select"
            id="vehicleClassId"
            name="vehicleClassId"
            defaultValue={vehicle?.vehicleClassId || classes[0]?.id}
            required
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid-2">
        <div className="field">
          <label className="label" htmlFor="seats">
            Lugares
          </label>
          <input
            className="input"
            id="seats"
            name="seats"
            type="number"
            defaultValue={vehicle?.seats || 3}
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="luggageCapacity">
            Capacidade de malas
          </label>
          <input
            className="input"
            id="luggageCapacity"
            name="luggageCapacity"
            type="number"
            defaultValue={vehicle?.luggageCapacity || 2}
            required
          />
        </div>
      </div>
      <button className="btn btn-primary" type="submit" disabled={loading || classes.length === 0}>
        {loading ? "A guardar…" : "Guardar veículo"}
      </button>
    </form>
  );
}
