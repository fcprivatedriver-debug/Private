"use client";

import { useEffect, useState } from "react";
import { readMelPrefs, writeMelPrefs } from "@/lib/mel-prefs";
import { isTtsSupported, stopSpeaking } from "@/modules/voice/speak-client";

export function VoicePrefsPanel() {
  const [speakMuted, setSpeakMuted] = useState(false);
  const [removeCalendarOnTaskDone, setRemoveOnDone] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const p = readMelPrefs();
    setSpeakMuted(p.speakMuted);
    setRemoveOnDone(p.removeCalendarOnTaskDone);
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <div className="stack">
      <div className="toggle-row">
        <div>
          <strong>A Mel fala as respostas</strong>
          <p className="muted small" style={{ margin: "0.25rem 0 0" }}>
            {isTtsSupported()
              ? "Por defeito a Mel lê as respostas em português de Portugal."
              : "Este browser não tem síntese de voz — as respostas ficam só em texto."}
          </p>
        </div>
        <input
          className="switch"
          type="checkbox"
          checked={!speakMuted}
          disabled={!isTtsSupported()}
          onChange={(e) => {
            const muted = !e.target.checked;
            writeMelPrefs({ speakMuted: muted });
            setSpeakMuted(muted);
            if (muted) stopSpeaking();
          }}
          aria-label="Activar voz da Mel"
        />
      </div>

      <div className="toggle-row">
        <div>
          <strong>Ao concluir tarefa, remover da agenda</strong>
          <p className="muted small" style={{ margin: "0.25rem 0 0" }}>
            Se desactivares, o bloco no calendário mantém-se após concluir.
          </p>
        </div>
        <input
          className="switch"
          type="checkbox"
          checked={removeCalendarOnTaskDone}
          onChange={(e) => {
            writeMelPrefs({ removeCalendarOnTaskDone: e.target.checked });
            setRemoveOnDone(e.target.checked);
          }}
          aria-label="Remover da agenda ao concluir"
        />
      </div>
    </div>
  );
}
