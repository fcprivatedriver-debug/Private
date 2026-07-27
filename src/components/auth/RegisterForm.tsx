"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { registerUser } from "@/actions/mel";
import { signIn } from "next-auth/react";

export function RegisterForm() {
  const t = useTranslations("auth");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const result = await registerUser(form);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (res?.error) {
      setError("Conta criada, mas o login falhou. Tenta entrar manualmente.");
      setLoading(false);
      return;
    }
    window.location.assign("/pt/hoje");
  }

  return (
    <form className="form-stack" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="name">{t("name")}</label>
        <input id="name" name="name" required minLength={2} autoComplete="name" />
      </div>
      <div className="field">
        <label htmlFor="email">{t("email")}</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="password">{t("password")}</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "A criar…" : t("submitRegister")}
      </button>
      <p className="muted small">
        {t("hasAccount")} <Link href="/login">{t("submitLogin")}</Link>
      </p>
    </form>
  );
}
