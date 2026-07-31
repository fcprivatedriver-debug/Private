"use client";

import { useActionState } from "react";
import { resendActivationAction, type ActionState } from "@/actions/auth";

const initial: ActionState = {};

export function ResendActivationForm({
  defaultEmail = "",
  compact = false,
}: {
  defaultEmail?: string;
  compact?: boolean;
}) {
  const [state, action, pending] = useActionState(resendActivationAction, initial);

  return (
    <form action={action} className={compact ? undefined : "panel"} style={{ marginTop: compact ? "0.75rem" : undefined }}>
      {!compact && (
        <p className="muted" style={{ marginTop: 0 }}>
          Não recebeu o e-mail ou o link expirou? Peça um novo link de ativação (válido 24 horas).
        </p>
      )}
      {state.error && <div className="alert alert-error">{state.error}</div>}
      {state.success && <div className="alert alert-success">{state.success}</div>}
      <div className="field" style={{ marginBottom: compact ? "0.5rem" : undefined }}>
        <label className="label" htmlFor="resend-email">
          E-mail
        </label>
        <input
          className="input"
          id="resend-email"
          name="email"
          type="email"
          required
          defaultValue={defaultEmail}
          autoComplete="email"
        />
      </div>
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "A enviar…" : "Reenviar e-mail de ativação"}
      </button>
    </form>
  );
}
