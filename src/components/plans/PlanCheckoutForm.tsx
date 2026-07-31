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
  ctaLabel,
  accent,
}: {
  planId: string;
  planName: string;
  priceLabel: string;
  ctaLabel?: string;
  accent?: string;
}) {
  const [state, action, pending] = useActionState(startPlanCheckoutAction, initial);

  useEffect(() => {
    if (state.redirectUrl) {
      window.location.href = state.redirectUrl;
    }
  }, [state.redirectUrl]);

  return (
    <form action={action} className="plan-checkout-inline">
      <input type="hidden" name="planId" value={planId} />
      {state.error && <div className="alert alert-error">{state.error}</div>}
      {state.success && <div className="alert alert-success">{state.success}</div>}

      <p className="muted" style={{ margin: "0 0 0.75rem", fontSize: "0.82rem" }}>
        Contratar <strong>{planName}</strong> — {priceLabel}/mês
      </p>

      <fieldset className="field" style={{ border: "none", padding: 0, margin: "0 0 0.75rem" }}>
        <legend className="label" style={{ marginBottom: "0.35rem", fontSize: "0.78rem" }}>
          Método de pagamento
        </legend>
        <label className="checkbox-row">
          <input type="radio" name="method" value="CARD" defaultChecked />
          <span>Cartão</span>
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
        <label className="label" htmlFor={`mbway-${planId}`} style={{ fontSize: "0.78rem" }}>
          Telemóvel MB WAY (opcional)
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

      <button
        className="btn plan-tier-cta"
        type="submit"
        disabled={pending}
        style={accent ? { background: accent, borderColor: accent } : undefined}
      >
        {pending ? "A processar…" : ctaLabel || "Contratar plano"}
      </button>
    </form>
  );
}
