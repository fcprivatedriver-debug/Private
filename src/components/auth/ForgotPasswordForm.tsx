"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { requestPasswordReset } from "@/actions/auth-account";

export function ForgotPasswordForm() {
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") || "");
    start(async () => {
      const res = await requestPasswordReset(email);
      setMsg("Se existir conta com este email, enviámos um link para recuperares a palavra-passe.");
      if (res.previewUrl) setPreview(res.previewUrl);
    });
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <BrandLogo href="/pt" />
        <h1>Recuperar palavra-passe</h1>
        <p className="lead">Indica o teu email — enviamos um link simples.</p>
        <form onSubmit={onSubmit} className="form-grid">
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <button className="btn btn-primary" type="submit" disabled={pending}>
            Enviar link
          </button>
        </form>
        {msg ? <p className="muted small">{msg}</p> : null}
        {preview ? (
          <p className="muted small">
            Sem servidor de email — <a href={preview}>abrir link de recuperação</a>
          </p>
        ) : null}
        <p className="muted small" style={{ marginTop: "1rem" }}>
          <Link href="/pt/login">Voltar ao login</Link>
        </p>
      </div>
    </div>
  );
}
