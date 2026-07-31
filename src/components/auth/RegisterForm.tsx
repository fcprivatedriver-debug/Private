"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { registerAction, type ActionState } from "@/actions/auth";
import { ResendActivationForm } from "@/components/auth/ResendActivationForm";

const initial: ActionState = {};

export function RegisterForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(registerAction, initial);

  if (state.success) {
    return (
      <section className="auth-shell fade-up">
        <div className="container" style={{ maxWidth: 480 }}>
          <h1 className="page-title">{t("registerTitle")}</h1>
          <div className="alert alert-success">{state.success}</div>
          {state.warning && <div className="alert alert-error">{state.warning}</div>}
          {(state.warning || state.email) && (
            <ResendActivationForm defaultEmail={state.email || ""} />
          )}
          <p style={{ marginTop: "1.25rem" }}>
            <Link href="/login" className="btn btn-primary">
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

        {state.error && <div className="alert alert-error">{state.error}</div>}

        <form action={action} className="panel">
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
            <input className="input" id="phone" name="phone" required autoComplete="tel" />
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
          <div className="field">
            <label className="label" htmlFor="confirmPassword">
              {t("confirmPassword")}
            </label>
            <input
              className="input"
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <label className="checkbox-row">
            <input type="checkbox" name="acceptTerms" value="on" required />
            <span>
              {t("acceptTerms")}{" "}
              <Link href="/termos" style={{ textDecoration: "underline" }}>
                {t("termsLink")}
              </Link>
            </span>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" name="acceptPrivacy" value="on" required />
            <span>
              {t("acceptPrivacy")}{" "}
              <Link href="/privacidade" style={{ textDecoration: "underline" }}>
                {t("privacyLink")}
              </Link>
            </span>
          </label>
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? t("creating") : t("createAccount")}
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
