"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[fc-private-driver] route error", {
      digest: error.digest,
      message: error.message,
      stack: error.stack,
    });
  }, [error]);

  return (
    <section className="auth-shell fade-up">
      <div className="container" style={{ maxWidth: 520 }}>
        <h1 className="page-title">Algo correu mal</h1>
        <p className="page-lead">
          Não foi possível carregar esta página. Tente novamente. Se o problema
          continuar, volte à página inicial.
        </p>
        {error.digest ? (
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            Ref: {error.digest}
          </p>
        ) : null}
        <div className="cta-row" style={{ marginTop: "1.25rem" }}>
          <button type="button" className="btn btn-primary" onClick={reset}>
            Tentar de novo
          </button>
          <Link href="/" className="btn btn-secondary">
            Ir para o início
          </Link>
        </div>
      </div>
    </section>
  );
}
