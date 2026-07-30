"use client";

import { getSession, signIn, useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { safePostLoginPath } from "@/lib/auth-routes";

function LoginFormInner() {
  const params = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("auth");
  const { data: session, status } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function go() {
    const target = safePostLoginPath(params.get("callbackUrl"), locale);
    window.location.assign(target);
  }

  useEffect(() => {
    if (status === "authenticated" && session?.user) go();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.id]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!res || res.error) {
        setError(t("invalidCredentials"));
        setLoading(false);
        return;
      }

      await getSession();
      go();
    } catch {
      setError("Não foi possível entrar. Verifica a ligação e tenta de novo.");
      setLoading(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={onSubmit}>
      <div className="demo-banner">{t("demoHint")}</div>
      <div className="field">
        <label htmlFor="email">{t("email")}</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue="filipe@mel.app"
        />
      </div>
      <div className="field">
        <label htmlFor="password">{t("password")}</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          defaultValue="mel123"
          minLength={6}
        />
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "A entrar…" : t("submitLogin")}
      </button>
      <p className="muted small">
        {t("noAccount")}{" "}
        <Link href="/registo">{t("submitRegister")}</Link>
      </p>
      <div className="bio-note">
        <strong>{t("biometricsTitle")}</strong>
        <p className="muted small" style={{ margin: "0.35rem 0 0" }}>
          {t("biometricsHint")}
        </p>
      </div>
    </form>
  );
}

export function LoginForm() {
  return (
    <Suspense fallback={<p className="muted">A carregar…</p>}>
      <LoginFormInner />
    </Suspense>
  );
}
