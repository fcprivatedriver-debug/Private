"use client";

import { useActionState } from "react";
import { upsertDriverAction } from "@/actions/admin";
import type { ActionState } from "@/actions/auth";

const initial: ActionState = {};

type Driver = {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  active: boolean;
  vehicle?: { make: string; model: string; plate: string } | null;
};

export function DriverUpsertForm({ drivers }: { drivers: Driver[] }) {
  const [state, formAction, pending] = useActionState(upsertDriverAction, initial);

  return (
    <div>
      {state.error && <div className="alert alert-error">{state.error}</div>}
      {state.success && <div className="alert alert-success">{state.success}</div>}

      <div className="list-stack" style={{ marginBottom: "1.5rem" }}>
        {drivers.map((d) => (
          <div key={d.id} className="list-item panel" style={{ cursor: "default" }}>
            <strong>{d.name}</strong>
            <div className="muted">{d.email}</div>
            {d.vehicle && (
              <div className="muted" style={{ fontSize: "0.88rem" }}>
                {d.vehicle.make} {d.vehicle.model} · {d.vehicle.plate}
              </div>
            )}
            <span className={`badge ${d.active ? "badge-success" : "badge-neutral"}`}>
              {d.active ? "Ativo" : "Inativo"}
            </span>
          </div>
        ))}
      </div>

      <form action={formAction} className="panel panel-lift">
        <h3 className="font-display" style={{ fontSize: "1.1rem" }}>
          Criar / atualizar motorista
        </h3>
        <div className="grid-2" style={{ marginTop: "0.75rem" }}>
          <input className="input" name="email" type="email" placeholder="E-mail" required />
          <input className="input" name="name" placeholder="Nome" required />
        </div>
        <div className="grid-2" style={{ marginTop: "0.5rem" }}>
          <input className="input" name="phone" placeholder="Telefone" />
          <input className="input" name="password" type="password" placeholder="Palavra-passe (opcional)" />
        </div>
        <div className="grid-2" style={{ marginTop: "0.5rem" }}>
          <input className="input" name="make" placeholder="Marca" defaultValue="Mercedes-Benz" />
          <input className="input" name="model" placeholder="Modelo" defaultValue="Classe E" />
        </div>
        <div className="grid-2" style={{ marginTop: "0.5rem" }}>
          <input className="input" name="plate" placeholder="Matrícula" />
          <input className="input" name="color" placeholder="Cor" defaultValue="Preto" />
        </div>
        <label className="quality-pill" style={{ marginTop: "0.5rem", display: "inline-flex" }}>
          <input type="checkbox" name="active" defaultChecked /> Ativo
        </label>
        <button type="submit" className="btn btn-primary" style={{ marginTop: "0.75rem" }} disabled={pending}>
          Guardar motorista
        </button>
      </form>
    </div>
  );
}
