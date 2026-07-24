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
  const [leaving, setLeaving] = useState(false);

  const configError = params.get("error") === "Configuration";

  function go(role?: string | null) {
    setLeaving(true);
    const target = safePostLoginPath(role, params.get("callbackUrl"), locale);
    window.location.assign(target);
  }

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      go(session.user.role);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- redirect once when authenticated
  }, [status, session?.user?.role]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
        setLoading(false);
        setError(t("loginTimeout"));
        return;
      }

      if (res.error) {
        setLoading(false);
        if (res.error === "Configuration" || res.status === 500) {
          setError(t("authConfigError"));
          return;
        }
        const code = "code" in res ? String((res as { code?: string }).code || "") : "";
        if (code === "email_not_verified" || res.error === "email_not_verified") {
          setError(t("emailNotVerified"));
          return;
        }
        setError(t("invalidCredentials"));
        return;
      }

      const fresh = await getSession();
      const role = fresh?.user?.role ?? session?.user?.role;
      go(role);
    } catch {
      setError(t("loginFailed"));
      setLoading(false);
      setLeaving(false);
    }
  }

  if (status === "authenticated" || leaving || loading) {
    return (
      <section className="auth-shell fade-up">
        <div className="container" style={{ maxWidth: 440 }}>
          <h1 className="page-title">{t("loginTitle")}</h1>
          <p className="page-lead">{loading ? t("loggingIn") : t("redirecting")}</p>
        </div>
      </section>
    );
  }

  if (status === "loading") {
    return (
      <section className="auth-shell fade-up">
        <div className="container" style={{ maxWidth: 440 }}>
          <p className="page-lead">{t("loadingSession")}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-shell fade-up">
      <div className="container" style={{ maxWidth: 440 }}>
        <h1 className="page-title">{t("loginTitle")}</h1>
        <p className="page-lead">{t("loginHint")}</p>
        {configError && <div className="alert alert-error">{t("authConfigError")}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={onSubmit} className="panel">
          <div className="field">
            <label className="label" htmlFor="email">
              {t("email")}
            </label>
            <input className="input" id="email" name="email" type="email" required autoComplete="email" />
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
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? t("loggingIn") : t("submitLogin")}
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
        <section className="auth-shell">
          <div className="container" style={{ maxWidth: 440 }}>
            <p className="page-lead">…</p>
          </div>
        </section>
      }
    >
      <LoginFormInner />
    </Suspense>
  );
}
