"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMemoryRule, deleteMemoryRule } from "@/actions/household";
import type { FinanceScope } from "@prisma/client";

type Rule = {
  id: string;
  triggerPhrase: string;
  scope: FinanceScope | null;
  categorySlug: string | null;
  hitCount: number;
  isActive: boolean;
};

export function MemoryRulesClient({ rules }: { rules: Rule[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="stack-lg">
      <form
        className="form-grid form-grid-compact"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const triggerPhrase = String(fd.get("trigger") || "").trim();
          const scope = String(fd.get("scope") || "PERSONAL") as FinanceScope;
          if (!triggerPhrase) return;
          start(async () => {
            await addMemoryRule({ triggerPhrase, scope });
            setMsg("Regra guardada. A Nina vai lembrar-se.");
            (e.target as HTMLFormElement).reset();
            router.refresh();
          });
        }}
      >
        <label className="field">
          <span>Quando eu disser…</span>
          <input name="trigger" placeholder="compras para casa" required />
        </label>
        <label className="field">
          <span>Registar em</span>
          <select name="scope" defaultValue="FAMILY">
            <option value="FAMILY">Conta Familiar</option>
            <option value="PERSONAL">As Minhas Finanças</option>
          </select>
        </label>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          Adicionar regra
        </button>
      </form>

      <div className="list-rows">
        {rules.map((r) => (
          <div key={r.id} className="list-row">
            <div className="list-row-main">
              <strong>“{r.triggerPhrase}”</strong>
              <span>
                → {r.scope === "FAMILY" ? "Conta Familiar" : "Finanças pessoais"}
                {r.categorySlug ? ` · ${r.categorySlug}` : ""} · usada {r.hitCount}×
              </span>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={pending}
              onClick={() => {
                start(async () => {
                  await deleteMemoryRule(r.id);
                  router.refresh();
                });
              }}
            >
              Apagar
            </button>
          </div>
        ))}
        {rules.length === 0 ? (
          <p className="muted">
            Ainda sem regras. Diz à Nina: «Sempre que eu disser compras para casa, regista na Conta Familiar.»
          </p>
        ) : null}
      </div>
      {msg ? <p className="muted">{msg}</p> : null}
    </div>
  );
}
