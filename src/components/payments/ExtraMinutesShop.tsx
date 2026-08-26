"use client";

import { useActionState } from "react";
import { buyExtraMinutesAction } from "@/actions/payments";
import type { ActionState } from "@/actions/auth";
import { formatEuros } from "@/lib/utils";

const initial: ActionState = {};

export function ExtraMinutesShop({
  packages,
}: {
  packages: { id: string; namePt: string; minutes: number; priceCents: number }[];
}) {
  const [state, formAction, pending] = useActionState(buyExtraMinutesAction, initial);

  return (
    <div>
      {state.error && <div className="alert alert-error">{state.error}</div>}
      {state.success && <div className="alert alert-success">{state.success}</div>}

      <div className="stat-grid">
        {packages.map((pkg) => (
          <form key={pkg.id} action={formAction} className="stat-card card-interactive">
            <input type="hidden" name="packageId" value={pkg.id} />
            <div className="label-sm">{pkg.namePt}</div>
            <strong style={{ fontSize: "1.5rem" }}>{pkg.minutes} min</strong>
            <p className="muted" style={{ margin: "0.35rem 0 0.75rem" }}>
              {formatEuros(pkg.priceCents)}
            </p>
            <button type="submit" className="btn btn-primary btn-sm btn-block" disabled={pending}>
              Comprar
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
