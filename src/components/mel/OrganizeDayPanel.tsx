"use client";

/**
 * Botão «Organiza o meu dia» — proposta → Aplicar / Ajustar / Cancelar.
 */
import { useState, useTransition } from "react";
import {
  proposeOrganizeDayAction,
  applyOrganizeDayAction,
} from "@/actions/mel";
import type { DayPlanProposal } from "@/modules/tasks/organize-day";
import { readMelPrefs } from "@/lib/mel-prefs";
import { speakText, unlockTts } from "@/modules/voice/speak-client";
import { showToast } from "@/modules/notifications/client";

export function OrganizeDayPanel() {
  const [proposal, setProposal] = useState<DayPlanProposal | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [prefer, setPrefer] = useState<"morning" | "afternoon">("morning");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function speakSummary(text: string) {
    const muted = readMelPrefs().speakMuted;
    speakText(text.replace(/\n/g, ". "), { muted });
  }

  function propose(opts?: { prefer?: "morning" | "afternoon" }) {
    unlockTts();
    setError(null);
    startTransition(async () => {
      try {
        const res = await proposeOrganizeDayAction({
          prefer: opts?.prefer,
        });
        setProposal(res.proposal);
        setAdjustOpen(false);
        speakSummary(res.proposal.summary);
      } catch {
        setError("Falha ao organizar o dia.");
      }
    });
  }

  function cancel() {
    setProposal(null);
    setAdjustOpen(false);
    setError(null);
  }

  function apply() {
    if (!proposal) return;
    startTransition(async () => {
      try {
        const res = await applyOrganizeDayAction(proposal.slots);
        showToast({
          title: "Organização aplicada",
          body: `${res.updated} tarefa${res.updated === 1 ? "" : "s"} actualizada${res.updated === 1 ? "" : "s"}.`,
          kind: "success",
        });
        setProposal(null);
        window.location.reload();
      } catch {
        setError("Falha ao aplicar.");
      }
    });
  }

  return (
    <div className="panel organize-panel">
      {!proposal ? (
        <div className="listen-actions">
          <button
            type="button"
            className="btn btn-primary listen-btn"
            onClick={() => propose()}
            disabled={pending}
          >
            {pending ? "A organizar…" : "Organiza o meu dia"}
          </button>
        </div>
      ) : (
        <div className="stack">
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Proposta para hoje</h2>
          <pre className="organize-summary" role="status">
            {proposal.summary}
          </pre>
          {proposal.questions.length > 0 ? (
            <ul className="list-plain">
              {proposal.questions.map((q) => (
                <li key={q} className="muted small">
                  {q}
                </li>
              ))}
            </ul>
          ) : null}
          {proposal.conflicts.length > 0 ? (
            <p className="reply-err small">{proposal.conflicts.join(" ")}</p>
          ) : null}

          {adjustOpen ? (
            <div className="form-stack">
              <div className="field">
                <label htmlFor="org-prefer">Preferência de horário</label>
                <select
                  id="org-prefer"
                  value={prefer}
                  onChange={(e) =>
                    setPrefer(e.target.value as "morning" | "afternoon")
                  }
                >
                  <option value="morning">Manhã (a partir das 09:00)</option>
                  <option value="afternoon">Tarde (a partir das 14:00)</option>
                </select>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={pending}
                onClick={() => propose({ prefer })}
              >
                Regenerar proposta
              </button>
            </div>
          ) : null}

          <div className="listen-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={pending || proposal.slots.length === 0}
              onClick={apply}
            >
              Aplicar organização
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={pending}
              onClick={() => setAdjustOpen((v) => !v)}
            >
              Ajustar
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={pending}
              onClick={cancel}
            >
              Cancelar
            </button>
          </div>
          <p className="muted small">
            Nada é alterado na agenda até clicares em «Aplicar organização».
          </p>
        </div>
      )}
      {error ? <p className="reply-err small">{error}</p> : null}
    </div>
  );
}
