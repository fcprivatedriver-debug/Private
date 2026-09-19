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
  const [devLink, setDevLink] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function resend(e: FormEvent) {
    e.preventDefault();
    start(async () => {
      setDevLink(null);
      const res = await resendVerificationEmail(email);
      if (!res.ok) {
        setMsg(res.error || "Não foi possível enviar o email agora.");
        return;
      }
      if ("already" in res && res.already) {
        setMsg("Este email já está verificado — podes entrar.");
        return;
      }
      // Nunca navegar para previewUrl (em Production era 127.0.0.1:3000).
      if (res.previewUrl) {
        setDevLink(res.previewUrl);
        setMsg("Em modo desenvolvimento, usa o link abaixo:");
        return;
      }
      if (res.delivered === false) {
        setMsg("Não foi possível entregar o email agora. Tenta daqui a um momento.");
        return;
      }
      setMsg("Email enviado. Verifica a tua caixa de entrada.");
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
            {pending ? "A enviar…" : "Reenviar email"}
          </button>
          <Link href="/pt/login" className="btn btn-primary">
            Ir para entrar
          </Link>
        </form>
        {msg ? <p className="muted small">{msg}</p> : null}
        {devLink ? (
          <p className="muted small">
            <a href={devLink}>abrir link de confirmação</a>
          </p>
        ) : null}
      </div>
    </div>
  );
}
