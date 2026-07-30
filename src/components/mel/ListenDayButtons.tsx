"use client";

import { useEffect, useState, useTransition } from "react";
import {
  dayBriefingAction,
  pendingBriefingAction,
} from "@/actions/mel";
import { readMelPrefs, writeMelPrefs } from "@/lib/mel-prefs";
import {
  isTtsSupported,
  speakSequence,
  stopSpeaking,
  unlockTts,
  warmTtsVoices,
} from "@/modules/voice/speak-client";

const ASK_THRESHOLD = 6;

export function ListenDayButtons() {
  const [muted, setMuted] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [tag, setTag] = useState("");
  const [pending, startTransition] = useTransition();
  const [lastScript, setLastScript] = useState<string | null>(null);

  useEffect(() => {
    warmTtsVoices();
    setMuted(readMelPrefs().speakMuted);
  }, []);

  function toggleMute() {
    unlockTts();
    const next = writeMelPrefs({ speakMuted: !muted });
    setMuted(next.speakMuted);
    if (next.speakMuted) stopSpeaking();
  }

  function speakParts(parts: string[]) {
    const prefs = readMelPrefs();
    const result = speakSequence(parts, { muted: prefs.speakMuted });
    setLastScript(parts.join(" "));
    if (!result.supported) {
      setWarning(result.error || "TTS indisponível — texto abaixo.");
    } else {
      setWarning(null);
    }
  }

  function onListenDay() {
    unlockTts();
    startTransition(async () => {
      try {
        const res = await dayBriefingAction();
        let parts = res.parts;
        if (res.count > ASK_THRESHOLD) {
          const onlyHigh = window.confirm(
            `Tens ${res.count} items hoje. Queres ouvir só as prioridades altas? (Cancelar = ouvir tudo)`,
          );
          if (onlyHigh && res.highOnlyParts?.length) {
            parts = res.highOnlyParts;
          }
        }
        speakParts(parts);
      } catch {
        setWarning("Não foi possível obter o dia.");
      }
    });
  }

  function onListenPending() {
    unlockTts();
    startTransition(async () => {
      try {
        const res = await pendingBriefingAction(tag.trim() || undefined);
        speakParts(res.parts);
      } catch {
        setWarning("Não foi possível obter pendentes.");
      }
    });
  }

  return (
    <div className="panel listen-panel">
      <div className="listen-actions">
        <button
          type="button"
          className="btn btn-primary listen-btn"
          onClick={onListenDay}
          disabled={pending}
        >
          Ouvir o meu dia
        </button>
        <button
          type="button"
          className="btn btn-secondary listen-btn"
          onClick={onListenPending}
          disabled={pending}
        >
          Ouvir pendentes
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={toggleMute}
          aria-pressed={muted}
          title={muted ? "Activar voz" : "Silenciar"}
        >
          {muted ? "Voz: off" : "Voz: on"}
        </button>
      </div>
      <div className="field" style={{ marginTop: "0.75rem" }}>
        <label htmlFor="pending-tag">Filtro de etiqueta (pendentes)</label>
        <input
          id="pending-tag"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="Opcional — ex.: casa"
        />
      </div>
      {!isTtsSupported() ? (
        <p className="muted small">Sem síntese de voz neste browser — o texto aparece abaixo.</p>
      ) : null}
      {warning ? <p className="muted small">{warning}</p> : null}
      {lastScript && (muted || !isTtsSupported()) ? (
        <p className="reply-ok" role="status">
          {lastScript}
        </p>
      ) : null}
    </div>
  );
}
