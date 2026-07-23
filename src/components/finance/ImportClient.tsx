"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IMPORT_PROVIDERS } from "@/domain/categories";
import { startImport, importCsvContent, confirmImportJob } from "@/actions/finance";
import type { ImportProvider } from "@prisma/client";

export function ImportClient() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [draftCount, setDraftCount] = useState(0);

  return (
    <div className="stack-lg">
      <div className="chip-grid">
        {IMPORT_PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="chip"
            disabled={pending}
            onClick={() => {
              start(async () => {
                const res = await startImport(p.id as ImportProvider);
                if (!res.ok) {
                  setMessage(res.error);
                  return;
                }
                setJobId(res.jobId);
                setDraftCount(res.drafts?.length ?? 0);
                setMessage(
                  res.drafts?.length
                    ? `${p.name}: ${res.drafts.length} despesa(s) pronta(s) a confirmar.`
                    : `${p.name}: ligação preparada. Autorize a integração quando disponível.`,
                );
                router.refresh();
              });
            }}
          >
            <strong>{p.name}</strong>
            <span>{p.kind === "api" ? "API / OAuth" : p.kind === "file" ? "Ficheiro" : "Email"}</span>
          </button>
        ))}
      </div>

      <label className="field">
        <span>Importar CSV (data;descrição;valor)</span>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              start(async () => {
                const res = await importCsvContent(String(reader.result || ""), file.name);
                if (res.ok) {
                  setJobId(res.jobId);
                  setDraftCount(res.drafts.length);
                  setMessage(`CSV: ${res.drafts.length} linhas prontas a confirmar.`);
                }
              });
            };
            reader.readAsText(file);
          }}
        />
      </label>

      {message ? <p className="muted">{message}</p> : null}

      {jobId && draftCount > 0 ? (
        <button
          className="btn btn-success"
          disabled={pending}
          type="button"
          onClick={() => {
            start(async () => {
              const res = await confirmImportJob(jobId);
              if (res.ok) {
                setMessage(`${res.count} despesas importadas.`);
                setJobId(null);
                setDraftCount(0);
                router.refresh();
              }
            });
          }}
        >
          Confirmar importação ({draftCount})
        </button>
      ) : null}
    </div>
  );
}
