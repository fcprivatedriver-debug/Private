"use client";

import { signIn } from "next-auth/react";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState, Suspense } from "react";
import { useTranslations } from "next-intl";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const t = useTranslations("auth");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(form.get("email")),
      password: String(form.get("password")),
      redirect: false,
    });
    if (res?.error) {
      setLoading(false);
      setError(t("invalidCredentials"));
      return;
    }

    const callback = params.get("callbackUrl");
    if (callback) {
      window.location.href = callback;
      return;
    }

    try {
      const me = await fetch("/api/me");
      const data = await me.json();
      const role = data?.user?.role as string | undefined;
      const dest =
        role === "DRIVER" ? "/painel" : role === "ADMIN" ? "/admin" : role === "CUSTOMER" ? "/pedidos" : "/";
      router.push(dest);
    } catch {
      router.push("/");
    }
    router.refresh();
  }

  return (
    <section className="section fade-up">
      <div className="container" style={{ maxWidth: 480 }}>
        <h1 className="font-display" style={{ fontSize: "2.4rem", marginBottom: "0.5rem" }}>
          {t("loginTitle")}
        </h1>
        <p className="muted" style={{ marginBottom: "1.5rem" }}>
          {t("loginHint")}
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={onSubmit} className="panel">
          <div className="field">
            <label className="label" htmlFor="email">
              {t("email")}
            </label>
            <input className="input" id="email" name="email" type="email" required />
          </div>
          <div className="field">
            <label className="label" htmlFor="password">
              {t("password")}
            </label>
            <input className="input" id="password" name="password" type="password" required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? t("loggingIn") : t("submitLogin")}
          </button>
        </form>
        <p className="muted" style={{ marginTop: "1rem" }}>
          {t("noAccount")} <Link href="/registo">{t("registerLink")}</Link>
        </p>
      </div>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
