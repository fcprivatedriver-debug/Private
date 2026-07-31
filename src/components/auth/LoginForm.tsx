"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { loginAction, type ActionState } from "@/actions/auth";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/config/brand";

const initial: ActionState = {};

export function LoginForm() {
  const t = useTranslations("auth");
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/pt/cliente";
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <section className="auth-shell fade-up">
      <div className="container" style={{ maxWidth: 440 }}>
        <h1 className="page-title">{t("loginTitle")}</h1>
        <p className="page-lead">{t("loginHint")}</p>

        {state.error && <div className="alert alert-error">{state.error}</div>}

        <form action={action} className="panel">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
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
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? t("loggingIn") : t("submitLogin")}
          </button>
        </form>

        <p className="muted" style={{ marginTop: "1rem" }}>
          <Link href="/recuperar" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
            {t("forgotPassword")}
          </Link>
        </p>

        <p className="muted" style={{ marginTop: "1.25rem" }}>
          {t("noAccount")}{" "}
          <Link href="/registo" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
            {t("registerLink")}
          </Link>
        </p>

        <div className="demo-hint">
          <strong>Contas demo</strong> (password <code>{DEMO_PASSWORD}</code>):
          <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.1rem" }}>
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email}>
                {a.label}: {a.email}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
