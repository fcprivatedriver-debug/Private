"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { registerFamily } from "@/actions/finance";
import { BrandLogo } from "@/components/layout/BrandLogo";

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    start(async () => {
      const res = await registerFamily(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
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
          Em minutos tens uma assistente financeira pessoal — simpática, clara e sempre disponível.
        </p>
        {error ? <p className="form-error">{error}</p> : null}
        <form onSubmit={onSubmit} className="form-grid">
          <label className="field">
            <span>O teu nome</span>
            <input name="name" required autoComplete="name" />
          </label>
          <label className="field">
            <span>Nome da família (opcional)</span>
            <input name="familyName" placeholder="Família Silva" />
          </label>
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label className="field">
            <span>Password</span>
            <input name="password" type="password" required minLength={6} autoComplete="new-password" />
          </label>
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? "A preparar…" : "Começar com a Nina"}
          </button>
        </form>
        <p className="muted small" style={{ marginTop: "1rem" }}>
          Já tens conta? <Link href="/pt/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
