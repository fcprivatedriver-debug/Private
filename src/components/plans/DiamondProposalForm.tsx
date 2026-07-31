"use client";

import { useActionState } from "react";
import { submitDiamondProposalAction } from "@/actions/diamond";
import type { ActionState } from "@/actions/auth";

const initial: ActionState = {};

export function DiamondProposalForm() {
  const [state, action, pending] = useActionState(submitDiamondProposalAction, initial);

  if (state.success) {
    return (
      <div className="card-soft diamond-form-shell fade-up">
        <h2 style={{ marginTop: 0 }}>Pedido enviado</h2>
        <p className="muted">{state.success}</p>
      </div>
    );
  }

  return (
    <form action={action} className="panel diamond-form-shell fade-up">
      <h2 style={{ marginTop: 0, fontFamily: "var(--font-display), Georgia, serif" }}>
        Solicitar proposta Diamante
      </h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Conte-nos as suas necessidades. Prepararemos uma solução exclusiva.
      </p>

      {state.error && <div className="alert alert-error">{state.error}</div>}

      <div className="field">
        <label className="label" htmlFor="name">
          Nome *
        </label>
        <input className="input" id="name" name="name" required autoComplete="name" />
      </div>

      <div className="field">
        <label className="label" htmlFor="company">
          Empresa (opcional)
        </label>
        <input className="input" id="company" name="company" autoComplete="organization" />
      </div>

      <div className="field">
        <label className="label" htmlFor="email">
          E-mail *
        </label>
        <input className="input" id="email" name="email" type="email" required autoComplete="email" />
      </div>

      <div className="field">
        <label className="label" htmlFor="phone">
          Telefone *
        </label>
        <input className="input" id="phone" name="phone" type="tel" required autoComplete="tel" />
      </div>

      <div className="field">
        <label className="label" htmlFor="estimatedUsers">
          Número estimado de utilizadores
        </label>
        <input className="input" id="estimatedUsers" name="estimatedUsers" type="number" min={1} />
      </div>

      <div className="field">
        <label className="label" htmlFor="tripsPerWeek">
          Número aproximado de viagens por semana
        </label>
        <input className="input" id="tripsPerWeek" name="tripsPerWeek" type="number" min={1} />
      </div>

      <div className="field">
        <label className="label" htmlFor="usualHours">
          Horários habituais
        </label>
        <input
          className="input"
          id="usualHours"
          name="usualHours"
          placeholder="Ex.: 08:00–10:00 e 18:00–20:00"
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="serviceZone">
          Zona de serviço
        </label>
        <input
          className="input"
          id="serviceZone"
          name="serviceZone"
          placeholder="Ex.: Lisboa, Cascais, Sintra"
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="notes">
          Observações
        </label>
        <textarea className="input" id="notes" name="notes" rows={4} />
      </div>

      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "A enviar…" : "Enviar pedido de proposta"}
      </button>
    </form>
  );
}
