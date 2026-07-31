"use client";

import { useActionState } from "react";
import { upsertPlanAction, upsertExtraPackageAction } from "@/actions/admin";
import type { ActionState } from "@/actions/auth";
import { formatEuros } from "@/lib/utils";

const initial: ActionState = {};

type Plan = {
  id: string;
  code: string;
  namePt: string;
  priceCents: number;
  monthlyMinutes: number;
  equivalentHours: number | null;
  active: boolean;
  sortOrder: number;
  featuresJson: string;
  descriptionPt: string | null;
};

type Pkg = {
  id: string;
  code: string;
  namePt: string;
  minutes: number;
  priceCents: number;
  active: boolean;
  sortOrder: number;
};

export function PlanEditor({ plans }: { plans: Plan[] }) {
  const [state, formAction, pending] = useActionState(upsertPlanAction, initial);

  return (
    <div>
      {state.error && <div className="alert alert-error">{state.error}</div>}
      {state.success && <div className="alert alert-success">{state.success}</div>}

      {plans.map((p) => (
        <form key={p.id} action={formAction} className="panel" style={{ marginBottom: "1rem" }}>
          <input type="hidden" name="id" value={p.id} />
          <div className="grid-2">
            <input className="input" name="code" defaultValue={p.code} placeholder="Código" required />
            <input className="input" name="namePt" defaultValue={p.namePt} placeholder="Nome PT" required />
          </div>
          <div className="grid-2" style={{ marginTop: "0.5rem" }}>
            <input className="input" name="priceEuros" type="number" step="0.01" defaultValue={(p.priceCents / 100).toFixed(2)} required />
            <input className="input" name="monthlyMinutes" type="number" defaultValue={p.monthlyMinutes} required />
          </div>
          <input className="input" name="descriptionPt" defaultValue={p.descriptionPt || ""} placeholder="Descrição" style={{ marginTop: "0.5rem" }} />
          <input type="hidden" name="featuresJson" value={p.featuresJson} />
          <input type="hidden" name="sortOrder" value={p.sortOrder} />
          <label className="quality-pill" style={{ marginTop: "0.5rem", display: "inline-flex" }}>
            <input type="checkbox" name="active" defaultChecked={p.active} /> Ativo
          </label>
          <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: "0.5rem" }} disabled={pending}>
            Guardar {p.namePt}
          </button>
        </form>
      ))}

      <form action={formAction} className="panel panel-lift">
        <strong>Novo plano</strong>
        <div className="grid-2" style={{ marginTop: "0.5rem" }}>
          <input className="input" name="code" placeholder="código" required />
          <input className="input" name="namePt" placeholder="Nome PT" required />
        </div>
        <div className="grid-2" style={{ marginTop: "0.5rem" }}>
          <input className="input" name="priceEuros" type="number" step="0.01" placeholder="Preço €" required />
          <input className="input" name="monthlyMinutes" type="number" placeholder="Minutos/mês" required />
        </div>
        <input type="hidden" name="featuresJson" value="[]" />
        <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: "0.5rem" }} disabled={pending}>
          Criar plano
        </button>
      </form>
    </div>
  );
}

export function PackageEditor({ packages }: { packages: Pkg[] }) {
  const [state, formAction, pending] = useActionState(upsertExtraPackageAction, initial);

  return (
    <div style={{ marginTop: "2rem" }}>
      <h2 className="font-display" style={{ fontSize: "1.25rem" }}>
        Pacotes de minutos extra
      </h2>
      {state.error && <div className="alert alert-error">{state.error}</div>}
      {state.success && <div className="alert alert-success">{state.success}</div>}

      {packages.map((p) => (
        <form key={p.id} action={formAction} className="panel" style={{ marginTop: "0.75rem" }}>
          <input type="hidden" name="id" value={p.id} />
          <div className="grid-2">
            <input className="input" name="code" defaultValue={p.code} required />
            <input className="input" name="namePt" defaultValue={p.namePt} required />
          </div>
          <div className="grid-2" style={{ marginTop: "0.5rem" }}>
            <input className="input" name="minutes" type="number" defaultValue={p.minutes} required />
            <input className="input" name="priceEuros" type="number" step="0.01" defaultValue={(p.priceCents / 100).toFixed(2)} required />
          </div>
          <p className="muted" style={{ fontSize: "0.84rem", margin: "0.35rem 0" }}>
            Atual: {formatEuros(p.priceCents)}
          </p>
          <label className="quality-pill">
            <input type="checkbox" name="active" defaultChecked={p.active} /> Ativo
          </label>
          <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: "0.5rem" }} disabled={pending}>
            Guardar
          </button>
        </form>
      ))}

      <form action={formAction} className="panel" style={{ marginTop: "0.75rem" }}>
        <strong>Novo pacote</strong>
        <div className="grid-2" style={{ marginTop: "0.5rem" }}>
          <input className="input" name="code" placeholder="código" required />
          <input className="input" name="namePt" placeholder="Nome" required />
        </div>
        <div className="grid-2" style={{ marginTop: "0.5rem" }}>
          <input className="input" name="minutes" type="number" placeholder="Minutos" required />
          <input className="input" name="priceEuros" type="number" step="0.01" placeholder="Preço €" required />
        </div>
        <button type="submit" className="btn btn-secondary btn-sm" style={{ marginTop: "0.5rem" }} disabled={pending}>
          Criar pacote
        </button>
      </form>
    </div>
  );
}
