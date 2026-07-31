"use client";

import { getSession, signIn, useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { safePostLoginPath } from "@/lib/auth-routes";

function LoginFormInner() {
  const params = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("auth");
  const { data: session, status } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const redirectingRef = useRef(false);

  const configError = params.get("error") === "Configuration";

  function go(role?: string | null, mode?: string | null) {
    if (redirectingRef.current) return;
    redirectingRef.current = true;
    const target = safePostLoginPath(role, params.get("callbackUrl"), locale, {
      activeMode: mode,
      hasCustomer: true,
      hasDriver: role === "DRIVER",
    });
    window.location.assign(target);
  }

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      go(session.user.role, session.user.activeMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.role, session?.user?.activeMode]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading || redirectingRef.current) return;

    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    try {
      const signInPromise = signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      const timeout = new Promise<null>((resolve) => {
        window.setTimeout(() => resolve(null), 20000);
      });

      const res = await Promise.race([signInPromise, timeout]);

      if (res === null) {
        setError("O login demorou demasiado. Verifique a ligação e tente novamente.");
        setLoading(false);
        return;
      }

      if (res.error) {
        if (res.error === "Configuration" || res.status === 500) {
          setError("Erro temporário de autenticação. Atualize a página ou tente de novo.");
        } else {
          setError(t("invalidCredentials"));
        }
        setLoading(false);
        return;
      }

      const fresh = await getSession();
      const role = fresh?.user?.role ?? session?.user?.role;
      const mode = fresh?.user?.activeMode ?? session?.user?.activeMode;
      go(role, mode);
      window.setTimeout(() => {
        if (redirectingRef.current) setLoading(false);
      }, 8000);
    } catch {
      setError("Não foi possível entrar. Verifique a ligação e tente de novo.");
      setLoading(false);
      redirectingRef.current = false;
    }
  }

  const redirecting = status === "authenticated" || redirectingRef.current;

  return (
    <section className="auth-shell fade-up">
      <div className="container" style={{ maxWidth: 440 }}>
        <h1 className="page-title">{t("loginTitle")}</h1>
        {redirecting && (
          <p className="muted" style={{ marginBottom: "1rem" }}>
            {t("loggingIn")}
          </p>
        )}
        {configError && (
          <div className="alert alert-error">
            Erro temporário de autenticação. Atualize a página ou faça redeploy na Vercel.
          </div>
        )}
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={onSubmit} className="panel">
          <div className="field">
            <label className="label" htmlFor="email">
              {t("email")}
            </label>
            <input
              className="input"
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              disabled={loading || redirecting}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="password">
              {t("password")}
            </label>
            <input
              className="input"
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              disabled={loading || redirecting}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading || redirecting}>
            {loading || redirecting ? t("loggingIn") : t("submitLogin")}
          </button>
        </form>
        <p className="muted" style={{ marginTop: "1.25rem" }}>
          {t("noAccount")}{" "}
          <Link href="/registo" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
            {t("registerLink")}
          </Link>
        </p>
      </div>
    </section>
  );
}

export function LoginForm() {
  return (
    <Suspense
      fallback={
        <section className="auth-shell fade-up">
          <div className="container" style={{ maxWidth: 440 }}>
            <h1 className="page-title">Entrar</h1>
            <div className="panel" aria-hidden>
              <div className="field">
                <label className="label">Email</label>
                <input className="input" disabled />
              </div>
              <div className="field">
                <label className="label">Palavra-passe</label>
                <input className="input" disabled />
              </div>
              <button className="btn btn-primary" type="button" disabled>
                Entrar
              </button>
            </div>
          </div>
        </section>
      }
    >
      <LoginFormInner />
    </Suspense>
  );
}
