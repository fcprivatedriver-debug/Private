"use client";

import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { registerAction, resendVerificationAction } from "@/actions/marketplace";
import { useSession } from "next-auth/react";
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
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resendNote, setResendNote] = useState<string | null>(null);

  function go(dest: string) {
    setLeaving(true);
    window.location.assign(`/${locale}${dest === "/" ? "" : dest}`);
  }

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      go(dashboardPathForRole(session.user.role));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.role]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    try {
      const result = await registerAction(formData);
      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }
      if ("needsVerification" in result && result.needsVerification) {
        setPendingEmail(result.email);
        setLoading(false);
        return;
      }
      window.location.assign(`/${locale}/login`);
    } catch {
      setError("Não foi possível registar. Tente de novo.");
      setLoading(false);
    }
  }

  async function onResend() {
    if (!pendingEmail) return;
    setResendNote(null);
    const result = await resendVerificationAction(pendingEmail);
    if (!result.ok) {
      setResendNote(result.error);
      return;
    }
    setResendNote(t("verificationResent"));
  }

  if (status === "authenticated" || leaving) {
    return (
      <section className="auth-shell fade-up">
        <div className="container" style={{ maxWidth: 480 }}>
          <h1 className="page-title">{t("registerTitle")}</h1>
          <p className="page-lead">A redirecionar…</p>
        </div>
      </section>
    );
  }

  if (pendingEmail) {
    return (
      <section className="auth-shell fade-up">
        <div className="container" style={{ maxWidth: 520 }}>
          <h1 className="page-title">{t("checkEmailTitle")}</h1>
          <p className="page-lead">
            {t("checkEmailLead", { email: pendingEmail })}
          </p>
          <div className="panel" style={{ marginBottom: "1rem" }}>
            <p style={{ margin: "0 0 0.75rem" }}>{t("checkEmailSteps")}</p>
            <ol style={{ margin: 0, paddingLeft: "1.2rem", color: "var(--muted)" }}>
              <li>{t("checkEmailStep1")}</li>
              <li>{t("checkEmailStep2")}</li>
              <li>{t("checkEmailStep3")}</li>
            </ol>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <Link href="/login" className="btn btn-primary">
              {t("loginLink")}
            </Link>
            <button type="button" className="btn btn-secondary" onClick={onResend}>
              {t("resendVerification")}
            </button>
          </div>
          {resendNote && (
            <p className="muted" style={{ marginTop: "1rem" }}>
              {resendNote}
            </p>
          )}
          <p className="muted" style={{ marginTop: "1.25rem" }}>
            <Link href="/login" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
              {t("loginLink")}
            </Link>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-shell fade-up">
      <div className="container" style={{ maxWidth: 480 }}>
        <h1 className="page-title">{t("registerTitle")}</h1>
        <p className="page-lead">{t("registerLead")}</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={onSubmit} className="panel">
          <div className="field">
            <label className="label" htmlFor="role">
              {t("accountType")}
            </label>
            <select className="select" id="role" name="role" defaultValue={defaultRole}>
              <option value="CUSTOMER">{t("customer")}</option>
              <option value="DRIVER">{t("driver")}</option>
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="name">
              {t("name")}
            </label>
            <input className="input" id="name" name="name" required autoComplete="name" />
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
            <input className="input" id="phone" name="phone" autoComplete="tel" />
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
              minLength={6}
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
