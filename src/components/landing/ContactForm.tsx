"use client";

import { useActionState } from "react";
import { contactFormAction } from "@/actions/admin";
import type { ActionState } from "@/actions/auth";

const initial: ActionState = {};

export function ContactForm() {
  const [state, action, pending] = useActionState(contactFormAction, initial);

  return (
    <form action={action} className="panel">
      {state.error && <div className="alert alert-error">{state.error}</div>}
      {state.success && <div className="alert alert-success">{state.success}</div>}
      <div className="field">
        <label className="label" htmlFor="contact-name">
          Nome
        </label>
        <input className="input" id="contact-name" name="name" required autoComplete="name" />
      </div>
      <div className="field">
        <label className="label" htmlFor="contact-email">
          E-mail
        </label>
        <input
          className="input"
          id="contact-email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </div>
      <div className="field">
        <label className="label" htmlFor="contact-message">
          Mensagem
        </label>
        <textarea className="textarea" id="contact-message" name="message" required />
      </div>
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "A enviar…" : "Enviar mensagem"}
      </button>
    </form>
  );
}
