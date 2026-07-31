"use client";

import { useActionState, useState, useTransition } from "react";
import { adminAdjustMinutesAction } from "@/actions/trips";
import { suspendCustomerAction, adminResendActivationAction } from "@/actions/admin";
import type { ActionState } from "@/actions/auth";

const initial: ActionState = {};

export function AdjustMinutesForm({ userId, userName }: { userId: string; userName: string }) {
  const [state, formAction, pending] = useActionState(adminAdjustMinutesAction, initial);

  return (
    <form action={formAction} className="panel" style={{ marginTop: "0.5rem" }}>
      <input type="hidden" name="userId" value={userId} />
      <div className="label-sm">Ajustar minutos — {userName}</div>
      {state.error && <div className="alert alert-error">{state.error}</div>}
      {state.success && <div className="alert alert-success">{state.success}</div>}
      <div className="grid-2" style={{ marginTop: "0.5rem" }}>
        <input className="input" type="number" name="minutes" placeholder="± minutos" required />
        <input className="input" name="reason" placeholder="Motivo obrigatório" required />
      </div>
      <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: "0.5rem" }} disabled={pending}>
        Aplicar
      </button>
    </form>
  );
}

export function SuspendButton({ userId, suspended }: { userId: string; suspended: boolean }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        className={`btn btn-sm ${suspended ? "btn-secondary" : "btn-danger"}`}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await suspendCustomerAction(userId, !suspended);
            setMsg(res.error || res.success || null);
          })
        }
      >
        {suspended ? "Reativar" : "Suspender"}
      </button>
      {msg && <span className="muted" style={{ marginLeft: "0.5rem", fontSize: "0.84rem" }}>{msg}</span>}
    </div>
  );
}

export function ResendActivationButton({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(adminResendActivationAction, initial);

  return (
    <form action={formAction} style={{ marginTop: "0.5rem" }}>
      <input type="hidden" name="userId" value={userId} />
      {state.error && <div className="alert alert-error">{state.error}</div>}
      {state.success && <div className="alert alert-success">{state.success}</div>}
      <button type="submit" className="btn btn-secondary btn-sm" disabled={pending}>
        {pending ? "A enviar…" : "Reenviar e-mail de ativação"}
      </button>
    </form>
  );
}
