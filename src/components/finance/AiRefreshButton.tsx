"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshAiInsights } from "@/actions/finance";

export function AiRefreshButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [report, setReport] = useState<string | null>(null);

  return (
    <div className="stack-lg">
      <button
        type="button"
        className="btn btn-primary"
        disabled={pending}
        onClick={() => {
          start(async () => {
            const res = await refreshAiInsights();
            if (res.ok) {
              setReport(res.report);
              router.refresh();
            }
          });
        }}
      >
        {pending ? "A analisar…" : "Atualizar análise IA"}
      </button>
      {report ? (
        <pre
          style={{
            whiteSpace: "pre-wrap",
            background: "var(--bg-soft)",
            padding: "1rem",
            borderRadius: 12,
            fontSize: "0.85rem",
          }}
        >
          {report}
        </pre>
      ) : null}
    </div>
  );
}
