"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Link, useRouter } from "@/i18n/navigation";
import { enableDriverModeAction } from "@/actions/account-mode";

export default function BecomeDriverPage() {
  const { data, status, update } = useSession();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onEnable() {
    setLoading(true);
    setError(null);
    const result = await enableDriverModeAction();
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await update({
      activeMode: "DRIVER",
      hasCustomer: true,
      hasDriver: true,
    });
    router.push("/onboarding");
    router.refresh();
  }

  if (status === "loading") {
    return (
      <section className="section">
        <div className="container">
          <p className="muted">A carregar…</p>
        </div>
      </section>
    );
  }

  if (!data?.user) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 560 }}>
          <h1 className="page-title">Quero ser motorista</h1>
          <p className="lead">
            Crie uma conta ou entre para iniciar o onboarding na mesma conta.
          </p>
          <div className="cta-row">
            <Link href="/registo?role=DRIVER" className="btn btn-primary">
              Criar conta de motorista
            </Link>
            <Link href="/login" className="btn btn-secondary">
              Entrar
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (data.user.hasDriver) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 560 }}>
          <h1 className="page-title">Já é motorista</h1>
          <p className="lead">Continue o onboarding ou abra o painel.</p>
          <div className="cta-row">
            <Link href="/onboarding" className="btn btn-primary">
              Continuar onboarding
            </Link>
            <Link href="/painel" className="btn btn-secondary">
              Painel
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 560 }}>
        <h1 className="page-title">Conduza com a ZELU</h1>
        <p className="lead">
          Vamos ativar o perfil de motorista na sua conta atual (
          {data.user.email}). Não é necessário criar outra conta.
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading}
          onClick={() => void onEnable()}
        >
          {loading ? "A ativar…" : "Começar onboarding"}
        </button>
      </div>
    </section>
  );
}
