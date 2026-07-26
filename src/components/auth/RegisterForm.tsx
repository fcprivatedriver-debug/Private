"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerFamily } from "@/actions/auth-account";
import { PASSWORD_HINT } from "@/lib/auth/password-rules";
import { BrandLogo } from "@/components/layout/BrandLogo";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await registerFamily(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.needsVerification) {
        const q = new URLSearchParams({ email: res.email });
        if (res.previewUrl) q.set("preview", res.previewUrl);
        router.push(`/pt/verificar-email?${q.toString()}`);
        return;
      }
      // Contas de teste (@nina.app) — entram de imediato
      const email = String(fd.get("email"));
      const password = String(fd.get("password"));
      const { signIn } = await import("next-auth/react");
      await signIn("credentials", {
        email,
        password,
        callbackUrl: "/pt/dashboard",
      });
    });
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <BrandLogo href="/pt" />
        <h1>Conhecer a Nina</h1>
        <p className="lead">
          Em menos de 3 minutos: conta, família e a tua assistente pessoal.
        </p>
        {error ? <p className="form-error">{error}</p> : null}
        <form onSubmit={onSubmit} className="form-grid">
          <label className="field">
            <span>O teu nome</span>
            <input name="name" required autoComplete="name" />
          </label>
          <label className="field">
            <span>Como pretendes chamar à tua família?</span>
            <input
              name="familyName"
              defaultValue="Família"
              placeholder="Família Silva, Nós, Casa…"
              required
            />
          </label>
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label className="field">
            <span>Palavra-passe</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <span className="muted small">{PASSWORD_HINT}</span>
          </label>
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? "A preparar…" : "Criar conta"}
          </button>
        </form>
        <p className="muted small" style={{ marginTop: "1rem" }}>
          Já tens conta? <Link href="/pt/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
