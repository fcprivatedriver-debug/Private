"use client";

import { getSession, signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { safePostLoginPath } from "@/lib/auth-routes";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { PasswordField } from "@/components/ui/PasswordField";
import {
  authenticateCredentials,
  resendVerificationEmail,
} from "@/actions/auth-account";

function LoginFormInner({ demoMode }: { demoMode: boolean }) {
  const params = useSearchParams();
  const locale = useLocale();
  const { data: session, status } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [emailValue, setEmailValue] = useState("");
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [resending, startResend] = useTransition();

  function go(role?: string | null) {
    setLeaving(true);
    window.location.assign(safePostLoginPath(role, params.get("callbackUrl"), locale));
  }

  useEffect(() => {
    if (status === "authenticated" && session?.user) go(session.user.role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.role]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUnverifiedEmail(null);
    setResendMsg(null);
    setDevLink(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    setEmailValue(email);
    try {
      // Credenciais primeiro — nunca reenviar email nem tratar password errada
      // como "email não verificado".
      const check = await authenticateCredentials(email, password);
      if (!check.ok && check.reason === "INVALID_CREDENTIALS") {
        setError("Email ou palavra-passe incorrectos. Tenta outra vez com calma.");
        setLoading(false);
        return;
      }
      if (!check.ok && check.reason === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(check.email);
        setEmailValue(check.email);
        setError(
          "Confirma o teu email antes de entrar. Se ainda não recebeste o link, podes reenviar abaixo.",
        );
        setLoading(false);
        return;
      }
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Email ou palavra-passe incorrectos. Tenta outra vez com calma.");
        setLoading(false);
        return;
      }
      const fresh = await getSession();
      go(fresh?.user?.role);
    } catch {
      setError("Não consegui entrar agora. Tenta daqui a um momento.");
      setLoading(false);
    }
  }

  function onResend() {
    if (!unverifiedEmail) return;
    startResend(async () => {
      setResendMsg(null);
      setDevLink(null);
      const res = await resendVerificationEmail(unverifiedEmail);
      if (!res.ok) {
        setResendMsg(res.error || "Não foi possível enviar o email agora.");
        return;
      }
      if ("already" in res && res.already) {
        setResendMsg("Este email já está verificado — podes entrar.");
        return;
      }
      // Nunca navegar para previewUrl (em Production/preview poderia ser loopback).
      if (res.previewUrl) {
        setDevLink(res.previewUrl);
        setResendMsg("Em modo desenvolvimento, usa o link abaixo:");
        return;
      }
      if (res.delivered === false) {
        setResendMsg("Não foi possível entregar o email agora. Tenta daqui a um momento.");
        return;
      }
      setResendMsg("Email enviado. Verifica a tua caixa de entrada.");
    });
  }

  if (status === "authenticated" || leaving || loading) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <BrandLogo href="/pt" />
          <h1>Um momento…</h1>
          <p className="lead">A MEL está a preparar tudo para ti.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <BrandLogo href="/pt" />
        <h1>Olá outra vez</h1>
        <p className="lead">Entra para continuares com a MEL.</p>
        {error ? <p className="form-error">{error}</p> : null}
        {unverifiedEmail ? (
          <div className="btn-row" style={{ marginBottom: "1rem" }}>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={resending}
              onClick={onResend}
            >
              {resending ? "A enviar…" : "Reenviar email"}
            </button>
          </div>
        ) : null}
        {resendMsg ? <p className="muted small">{resendMsg}</p> : null}
        {devLink ? (
          <p className="muted small">
            <a href={devLink}>abrir link de confirmação</a>
          </p>
        ) : null}
        <form onSubmit={onSubmit} className="form-grid">
          <label className="field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="o.teu@email.com"
              value={emailValue}
              onChange={(ev) => setEmailValue(ev.target.value)}
            />
          </label>
          <PasswordField
            label="Palavra-passe"
            name="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
          />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            Entrar
          </button>
        </form>
        {demoMode ? (
          <p className="muted small" style={{ marginTop: "1rem" }}>
            <strong>Modo Demo (só desenvolvimento)</strong>: demo@nina.app · nina123
          </p>
        ) : null}
        <p className="muted small" style={{ marginTop: "1rem" }}>
          <Link href="/pt/recuperar">Recuperar palavra-passe</Link>
          {" · "}
          <Link href="/pt/registo">Criar conta</Link>
        </p>
      </div>
    </div>
  );
}

export function LoginForm({ demoMode = false }: { demoMode?: boolean }) {
  return (
    <Suspense
      fallback={
        <div className="auth-page">
          <div className="auth-card">
            <p className="lead">…</p>
          </div>
        </div>
      }
    >
      <LoginFormInner demoMode={demoMode} />
    </Suspense>
  );
}
