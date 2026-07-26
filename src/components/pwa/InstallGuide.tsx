"use client";

import { useEffect, useState } from "react";

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function InstallGuide() {
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIos());
  }, []);

  if (installed) {
    return (
      <p className="muted small" style={{ margin: 0 }}>
        A Nina já está instalada neste dispositivo — a usar em ecrã inteiro.
      </p>
    );
  }

  return (
    <div className="stack-sm">
      <p className="muted small" style={{ marginTop: 0 }}>
        Abre no browser e adiciona ao ecrã principal para usar como app.
      </p>
      {ios ? (
        <ol className="install-steps">
          <li>Toca em <strong>Partilhar</strong> (□↑) no Safari</li>
          <li>Escolhe <strong>Adicionar ao Ecrã Principal</strong></li>
          <li>Confirma o nome <strong>Nina</strong></li>
        </ol>
      ) : (
        <ol className="install-steps">
          <li>No Chrome/Edge, abre o menu (⋮)</li>
          <li>Escolhe <strong>Instalar aplicação</strong> / <strong>Adicionar ao ecrã principal</strong></li>
          <li>Ou aceita o aviso «Instalar Nina» quando aparecer</li>
        </ol>
      )}
      <p className="muted small" style={{ marginBottom: 0 }}>
        Atalhos longos no ícone: Dashboard, Falar, Fotografar Fatura, Compras, Objetivos.
      </p>
    </div>
  );
}
