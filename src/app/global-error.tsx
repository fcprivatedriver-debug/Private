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
    console.error("[fc-private-driver] global error", {
      digest: error.digest,
      message: error.message,
      stack: error.stack,
    });
  }, [error]);

  return (
    <html lang="pt">
      <body style={{ fontFamily: "Georgia, serif", padding: "2rem", color: "#1a1a1a" }}>
        <p style={{ letterSpacing: "0.16em", color: "#0A4F5C", fontWeight: 700, fontSize: 12 }}>
          FC PRIVATE DRIVER
        </p>
        <h1 style={{ fontSize: "1.5rem" }}>Não foi possível carregar a página</h1>
        <p>Ocorreu um erro inesperado. Tente novamente dentro de momentos.</p>
        {error.digest ? (
          <p style={{ opacity: 0.65, fontSize: 13 }}>Referência: {error.digest}</p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 16,
            background: "#0A4F5C",
            color: "#fff",
            border: 0,
            padding: "10px 18px",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Tentar de novo
        </button>
      </body>
    </html>
  );
}
