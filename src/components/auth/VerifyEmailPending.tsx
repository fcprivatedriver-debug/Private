"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { resendVerificationEmail } from "@/actions/auth-account";

export function VerifyEmailPending() {
  const params = useSearchParams();
  const email = params.get("email") || "";
  const preview = params.get("preview");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function resend(e: FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await resendVerificationEmail(email);
      if (res.previewUrl) {
        setMsg("Em modo desenvolvimento, usa este link:");
        window.location.href = res.previewUrl;
        return;
      }
      setMsg("Se o email existir, enviámos um novo link.");
    });
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <BrandLogo href="/pt" />
        <h1>Confirma o teu email</h1>
        <p className="lead">
          Enviámos um link para <strong>{email || "o teu email"}</strong>. A conta fica activa
          depois de confirmares — demora um clique.
        </p>
        {preview ? (
          <p className="muted small">
            Ambiente sem servidor de email —{" "}
            <a href={preview}>abrir link de confirmação</a>
          </p>
        ) : null}
        <form onSubmit={resend} className="btn-row" style={{ marginTop: "1rem" }}>
          <button className="btn btn-ghost" type="submit" disabled={pending || !email}>
            Reenviar email
          </button>
          <Link href="/pt/login" className="btn btn-primary">
            Ir para entrar
          </Link>
        </form>
        {msg ? <p className="muted small">{msg}</p> : null}
      </div>
    </div>
  );
}
