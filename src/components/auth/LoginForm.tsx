"use client";

import { getSession, signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { safePostLoginPath } from "@/lib/auth-routes";
import { BrandLogo } from "@/components/layout/BrandLogo";

function LoginFormInner() {
  const params = useSearchParams();
  const locale = useLocale();
  const { data: session, status } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [leaving, setLeaving] = useState(false);

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
    const form = new FormData(e.currentTarget);
    try {
      const res = await signIn("credentials", {
        email: String(form.get("email")),
        password: String(form.get("password")),
        redirect: false,
      });
      if (res?.error) {
        setError("Email ou password incorretos. Tenta outra vez com calma.");
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

  if (status === "authenticated" || leaving || loading) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <BrandLogo href="/pt" />
          <h1>Um momento…</h1>
          <p className="lead">A Nina está a preparar tudo para ti.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <BrandLogo href="/pt" />
        <h1>Olá outra vez</h1>
        <p className="lead">Entra para continuares a conversa com a Nina.</p>
        {error ? <p className="form-error">{error}</p> : null}
        <form onSubmit={onSubmit} className="form-grid">
          <label className="field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue="familia@nina.app"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              defaultValue="nina123"
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            Entrar
          </button>
        </form>
        <p className="muted small" style={{ marginTop: "1rem" }}>
          Demo: familia@nina.app / nina123
        </p>
        <p className="muted small">
          Ainda não falaste com a Nina? <Link href="/pt/registo">Criar conta</Link>
        </p>
      </div>
    </div>
  );
}

export function LoginForm() {
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
      <LoginFormInner />
    </Suspense>
  );
}
