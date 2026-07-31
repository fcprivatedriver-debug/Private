"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[zelu] global error", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <html lang="pt">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
        <h1>ZELU</h1>
        <p>Ocorreu um erro ao carregar a aplicação. Tente novamente.</p>
        {error.digest ? <p style={{ opacity: 0.7 }}>Ref: {error.digest}</p> : null}
        <button type="button" onClick={reset}>
          Tentar de novo
        </button>
      </body>
    </html>
  );
}
