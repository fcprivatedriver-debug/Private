"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { loginAction, type ActionState } from "@/actions/auth";
import { ResendActivationForm } from "@/components/auth/ResendActivationForm";

const initial: ActionState = {};
const showDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

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
        {state.email && state.error?.includes("e-mail") && (
          <ResendActivationForm defaultEmail={state.email} compact />
        )}

        <form action={action} className="panel">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
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
              disabled={pending}
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
              disabled={pending}
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

        {showDemo ? (
          <p className="muted" style={{ marginTop: "1rem", fontSize: "0.85rem" }}>
            Modo demonstração ativo.
          </p>
        ) : null}
      </div>
    </section>
  );
}
