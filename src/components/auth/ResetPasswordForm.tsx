"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { resetPasswordWithToken } from "@/actions/auth-account";
import { PASSWORD_HINT } from "@/lib/auth/password-rules";
import { PasswordField } from "@/components/ui/PasswordField";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") || "");
    const confirm = String(fd.get("confirm") || "");
    if (password !== confirm) {
      setError("As palavras-passe não coincidem.");
      return;
    }
    start(async () => {
      const res = await resetPasswordWithToken(token, password);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/pt/login");
    });
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <BrandLogo href="/pt" />
        <h1>Nova palavra-passe</h1>
        <p className="lead">Escolhe uma palavra-passe forte e segura.</p>
        {error ? <p className="form-error">{error}</p> : null}
        <form onSubmit={onSubmit} className="form-grid">
          <PasswordField
            label="Nova palavra-passe"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            hint={PASSWORD_HINT}
          />
          <PasswordField
            label="Confirmar"
            name="confirm"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <button className="btn btn-primary" type="submit" disabled={pending}>
            Guardar
          </button>
        </form>
        <p className="muted small" style={{ marginTop: "1rem" }}>
          <Link href="/pt/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
