"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import Link from "next/link";
import {
  deleteOwnAccount,
  deleteReceiptMedia,
  deleteTransactionHistory,
  exportAllPersonalData,
  revokeAllConnections,
} from "@/actions/privacy";

export function PrivacyControls() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function downloadJson(filename: string, json: string) {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="stack-lg">
      <div className="btn-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={pending}
          onClick={() => {
            start(async () => {
              const res = await exportAllPersonalData();
              if (res.ok) {
                downloadJson(res.filename, res.json);
                setMsg("Exportação pronta.");
              }
            });
          }}
        >
          Exportar todos os dados (JSON)
        </button>

        <button
          type="button"
          className="btn btn-ghost"
          disabled={pending}
          onClick={() => {
            start(async () => {
              const res = await deleteReceiptMedia();
              if (res.ok) setMsg(`Fotografias/faturas removidas (${res.count} movimentos).`);
              router.refresh();
            });
          }}
        >
          Eliminar fotografias e faturas
        </button>

        <button
          type="button"
          className="btn btn-ghost"
          disabled={pending}
          onClick={() => {
            if (!confirm("Apagar todo o histórico de receitas e despesas?")) return;
            start(async () => {
              const res = await deleteTransactionHistory();
              if (!res.ok) setMsg(res.error);
              else setMsg("Histórico eliminado. A conta voltou a zeros.");
              router.refresh();
            });
          }}
        >
          Eliminar histórico financeiro
        </button>

        <button
          type="button"
          className="btn btn-ghost"
          disabled={pending}
          onClick={() => {
            start(async () => {
              await revokeAllConnections();
              setMsg("Ligações pausadas.");
              router.refresh();
            });
          }}
        >
          Pausar todas as ligações / permissões
        </button>

        <button
          type="button"
          className="btn btn-danger-outline"
          disabled={pending}
          onClick={() => {
            if (!confirm("Eliminar a conta de forma permanente? Esta ação não tem volta.")) return;
            start(async () => {
              const res = await deleteOwnAccount();
              if (!res.ok) {
                setMsg(res.error);
                return;
              }
              await signOut({ callbackUrl: "/pt" });
            });
          }}
        >
          Eliminar conta
        </button>
      </div>

      <p className="muted small">
        Consulta também a{" "}
        <Link href="/pt/privacidade">Política de Privacidade</Link> e os{" "}
        <Link href="/pt/termos">Termos e Condições</Link>.
      </p>
      {msg ? <p className="muted">{msg}</p> : null}
    </div>
  );
}
