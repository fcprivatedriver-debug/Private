"use client";

import { useActionState, useEffect } from "react";
import { startPlanCheckoutAction } from "@/actions/payments";
import type { ActionState } from "@/actions/auth";

type CheckoutState = ActionState & { redirectUrl?: string; demoPaymentId?: string };

const initial: CheckoutState = {};

export function PlanCheckoutForm({
  planId,
  planName,
  priceLabel,
}: {
  planId: string;
  planName: string;
  priceLabel: string;
}) {
  const [state, action, pending] = useActionState(startPlanCheckoutAction, initial);

  useEffect(() => {
    if (state.redirectUrl) {
      window.location.href = state.redirectUrl;
    }
  }, [state.redirectUrl]);

  return (
    <form action={action} className="panel" style={{ marginTop: "1rem" }}>
      <input type="hidden" name="planId" value={planId} />
      {state.error && <div className="alert alert-error">{state.error}</div>}
      {state.success && <div className="alert alert-success">{state.success}</div>}

      <p className="muted" style={{ margin: "0 0 1rem", fontSize: "0.9rem" }}>
        Contratar <strong>{planName}</strong> — {priceLabel}/mês
      </p>

      <fieldset className="field" style={{ border: "none", padding: 0, margin: 0 }}>
        <legend className="label" style={{ marginBottom: "0.5rem" }}>
          Método de pagamento
        </legend>
        <label className="checkbox-row">
          <input type="radio" name="method" value="CARD" defaultChecked />
          <span>Cartão (Visa / Mastercard)</span>
        </label>
        <label className="checkbox-row">
          <input type="radio" name="method" value="MB_WAY" />
          <span>MB WAY</span>
        </label>
        <label className="checkbox-row">
          <input type="radio" name="method" value="MULTIBANCO" />
          <span>Multibanco</span>
        </label>
      </fieldset>

      <div className="field">
        <label className="label" htmlFor={`mbway-${planId}`}>
          Telemóvel MB WAY (se aplicável)
        </label>
        <input
          className="input"
          id={`mbway-${planId}`}
          name="mbWayPhone"
          type="tel"
          placeholder="+351 9xx xxx xxx"
          autoComplete="tel"
        />
      </div>

      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "A processar…" : "Contratar plano"}
      </button>
    </form>
  );
}
