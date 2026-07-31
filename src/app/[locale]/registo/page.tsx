"use client";

import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { registerAction } from "@/actions/marketplace";
import { signIn, useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { dashboardPathForRole } from "@/lib/auth-routes";

function RegisterFormInner() {
  const params = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("auth");
  const { data: session, status } = useSession();
  const defaultRole = params.get("role") === "DRIVER" ? "DRIVER" : "CUSTOMER";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [leaving, setLeaving] = useState(false);
  /** Skip auto-redirect while we intentionally navigate after a successful register. */
  const [skipAuthRedirect, setSkipAuthRedirect] = useState(false);

  function go(dest: string) {
    setLeaving(true);
    window.location.assign(`/${locale}${dest === "/" ? "" : dest}`);
  }

  useEffect(() => {
    if (skipAuthRedirect) return;
    if (status === "authenticated" && session?.user) {
      go(dashboardPathForRole(session.user.role));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.role, skipAuthRedirect]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const result = await registerAction(formData);
      if (!result.ok) {
        setError(result.error || "Erro interno.");
        setLoading(false);
        return;
      }

      setSkipAuthRedirect(true);
      const login = await signIn("credentials", {
        email: String(formData.get("email")),
        password: String(formData.get("password")),
        redirect: false,
      });

      if (login?.error) {
        setLoading(false);
        setError("Conta criada, mas o início de sessão falhou. Tenta entrar manualmente.");
        return;
      }

      const role = String(formData.get("role"));
      go(role === "DRIVER" ? "/onboarding" : "/pedidos/novo");
    } catch (err) {
      console.error("[registo]", err);
      setError("Erro de ligação ao servidor.");
      setLoading(false);
      setSkipAuthRedirect(false);
    }
  }

  if ((status === "authenticated" && !skipAuthRedirect) || leaving) {
    return (
      <section className="auth-shell fade-up">
        <div className="container" style={{ maxWidth: 480 }}>
          <h1 className="page-title">{t("registerTitle")}</h1>
          <p className="page-lead">A redirecionar…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-shell fade-up">
      <div className="container" style={{ maxWidth: 480 }}>
        <h1 className="page-title">{t("registerTitle")}</h1>
        <p className="page-lead">{t("registerLead")}</p>
        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={onSubmit} className="panel" noValidate>
          <div className="field">
            <label className="label" htmlFor="role">
              {t("accountType")}
            </label>
            <select className="select" id="role" name="role" defaultValue={defaultRole} required>
              <option value="CUSTOMER">{t("customer")}</option>
              <option value="DRIVER">{t("driver")}</option>
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="name">
              {t("name")}
            </label>
            <input className="input" id="name" name="name" required minLength={2} autoComplete="name" />
          </div>
          <div className="field">
            <label className="label" htmlFor="email">
              {t("email")}
            </label>
            <input className="input" id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="field">
            <label className="label" htmlFor="phone">
              {t("phone")}
            </label>
            <input
              className="input"
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+351…"
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
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? t("creating") : t("createAccount")}
          </button>
        </form>
        <p className="muted" style={{ marginTop: "1.25rem" }}>
          {t("hasAccount")}{" "}
          <Link href="/login" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
            {t("loginLink")}
          </Link>
        </p>
      </div>
    </section>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterFormInner />
    </Suspense>
  );
}
