"use client";

import { getSession, signIn } from "next-auth/react";
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

  const configError = params.get("error") === "Configuration";

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
        setError(
          "O login demorou demasiado (base de dados). Tente de novo daqui a alguns segundos.",
        );
        return;
      }

      if (res.error) {
        if (res.error === "Configuration" || res.status === 500) {
          setError("Erro temporário de autenticação. Atualize a página ou tente de novo.");
          return;
        }
        setError(t("invalidCredentials"));
        return;
      }

      const callback = params.get("callbackUrl");
      if (callback) {
        window.location.href = callback;
        return;
      }

      // Prefer JWT session (no extra Prisma round-trip via /api/me)
      const session = await getSession();
      const role = session?.user?.role as string | undefined;
      const dest =
        role === "DRIVER"
          ? "/painel"
          : role === "ADMIN"
            ? "/admin"
            : role === "CUSTOMER"
              ? "/pedidos"
              : "/";
      router.push(dest);
      router.refresh();
    } catch {
      setError("Não foi possível entrar. Verifique a ligação e tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-shell fade-up">
      <div className="container" style={{ maxWidth: 440 }}>
        <h1 className="page-title">{t("loginTitle")}</h1>
        <p className="page-lead">{t("loginHint")}</p>
        {configError && (
          <div className="alert alert-error">
            Erro temporário de autenticação. Atualize a página ou faça redeploy na Vercel.
          </div>
        )}
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
