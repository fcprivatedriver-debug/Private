"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  requestPasswordResetAction,
  resetPasswordAction,
  type ActionState,
} from "@/actions/auth";

const initial: ActionState = {};

function RequestResetForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(requestPasswordResetAction, initial);

  return (
    <form action={action} className="panel">
      {state.error && <div className="alert alert-error">{state.error}</div>}
      {state.success && <div className="alert alert-success">{state.success}</div>}
      <div className="field">
        <label className="label" htmlFor="email">
          {t("email")}
        </label>
        <input className="input" id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? t("sending") : t("sendReset")}
      </button>
    </form>
  );
}

function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(resetPasswordAction, initial);

  if (state.success) {
    return (
      <>
        <div className="alert alert-success">{state.success}</div>
        <Link href="/login" className="btn btn-primary">
          {t("loginLink")}
        </Link>
      </>
    );
  }

  return (
    <form action={action} className="panel">
      <input type="hidden" name="token" value={token} />
      {state.error && <div className="alert alert-error">{state.error}</div>}
      <div className="field">
        <label className="label" htmlFor="password">
          {t("newPassword")}
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
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? t("saving") : t("resetPassword")}
      </button>
    </form>
  );
}

export function RecoverPasswordForm() {
  const t = useTranslations("auth");
  const params = useSearchParams();
  const token = params.get("token");

  return (
    <section className="auth-shell fade-up">
      <div className="container" style={{ maxWidth: 440 }}>
        <h1 className="page-title">{token ? t("resetTitle") : t("recoverTitle")}</h1>
        <p className="page-lead">{token ? t("resetLead") : t("recoverLead")}</p>
        {token ? <ResetPasswordForm token={token} /> : <RequestResetForm />}
        <p className="muted" style={{ marginTop: "1.25rem" }}>
          <Link href="/login" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
            {t("loginLink")}
          </Link>
        </p>
      </div>
    </section>
  );
}
