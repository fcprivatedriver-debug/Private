"use client";

import { useEffect, useState } from "react";
import { readMelPrefs, writeMelPrefs } from "@/lib/mel-prefs";
import { isTtsSupported, stopSpeaking } from "@/modules/voice/speak-client";
import { ensureNotificationPermission } from "@/modules/notifications/client";

export function VoicePrefsPanel() {
  const [speakMuted, setSpeakMuted] = useState(false);
  const [removeCalendarOnTaskDone, setRemoveOnDone] = useState(false);
  const [pushRemindersEnabled, setPush] = useState(false);
  const [ready, setReady] = useState(false);
  const [permNote, setPermNote] = useState<string | null>(null);

  useEffect(() => {
    const p = readMelPrefs();
    setSpeakMuted(p.speakMuted);
    setRemoveOnDone(p.removeCalendarOnTaskDone);
    setPush(p.pushRemindersEnabled);
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
            Desactivado (padrão): o bloco fica riscado/concluído. Activado: remove-se da agenda.
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

      <div className="toggle-row">
        <div>
          <strong>Lembretes 15 min antes (notificação)</strong>
          <p className="muted small" style={{ margin: "0.25rem 0 0" }}>
            Usa a API de Notificações do browser (não Push VAPID). Em iOS PWA o
            suporte em background é limitado.
          </p>
          {permNote ? (
            <p className="muted small" style={{ margin: "0.25rem 0 0" }}>
              {permNote}
            </p>
          ) : null}
        </div>
        <input
          className="switch"
          type="checkbox"
          checked={pushRemindersEnabled}
          onChange={async (e) => {
            const enabled = e.target.checked;
            if (enabled) {
              const perm = await ensureNotificationPermission();
              if (perm !== "granted") {
                setPermNote(
                  perm === "denied"
                    ? "Permissão negada — fica só o aviso in-app."
                    : "Notificações indisponíveis neste browser.",
                );
                writeMelPrefs({ pushRemindersEnabled: false });
                setPush(false);
                return;
              }
              setPermNote("Permissão concedida.");
            } else {
              setPermNote(null);
            }
            writeMelPrefs({ pushRemindersEnabled: enabled });
            setPush(enabled);
          }}
          aria-label="Activar lembretes de notificação"
        />
      </div>
    </div>
  );
}
