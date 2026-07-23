"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { registerAction } from "@/actions/marketplace";
import { signIn } from "next-auth/react";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const defaultRole = params.get("role") === "DRIVER" ? "DRIVER" : "CUSTOMER";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await registerAction(formData);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    const login = await signIn("credentials", {
      email: String(formData.get("email")),
      password: String(formData.get("password")),
      redirect: false,
    });
    setLoading(false);
    if (login?.error) {
      router.push("/login");
      return;
    }
    const role = String(formData.get("role"));
    router.push(role === "DRIVER" ? "/veiculo" : "/pedidos/novo");
    router.refresh();
  }

  return (
    <section className="section fade-up">
      <div className="container" style={{ maxWidth: 520 }}>
        <h1 className="font-display" style={{ fontSize: "2.4rem", marginBottom: "0.5rem" }}>
          Criar conta Movio
        </h1>
        <p className="muted" style={{ marginBottom: "1.5rem" }}>
          Escolhe se queres pedir viagens ou enviar propostas.
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={onSubmit} className="panel">
          <div className="field">
            <label className="label" htmlFor="role">
              Tipo de conta
            </label>
            <select className="select" id="role" name="role" defaultValue={defaultRole}>
              <option value="CUSTOMER">Cliente</option>
              <option value="DRIVER">Motorista</option>
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="name">
              Nome
            </label>
            <input className="input" id="name" name="name" required />
          </div>
          <div className="field">
            <label className="label" htmlFor="email">
              Email
            </label>
            <input className="input" id="email" name="email" type="email" required />
          </div>
          <div className="field">
            <label className="label" htmlFor="phone">
              Telefone
            </label>
            <input className="input" id="phone" name="phone" />
          </div>
          <div className="field">
            <label className="label" htmlFor="password">
              Password
            </label>
            <input className="input" id="password" name="password" type="password" minLength={6} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "A criar…" : "Criar conta"}
          </button>
        </form>
        <p className="muted" style={{ marginTop: "1rem" }}>
          Já tens conta? <Link href="/login">Entrar</Link>
        </p>
      </div>
    </section>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
