"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { chatAction } from "@/actions/mel";
import { readMelPrefs, writeMelPrefs } from "@/lib/mel-prefs";
import {
  speakText,
  stopSpeaking,
  warmTtsVoices,
  isTtsSupported,
} from "@/modules/voice/speak-client";

type Msg = { role: "USER" | "ASSISTANT"; content: string };

export function MelChat({ initial }: { initial: Msg[] }) {
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [muted, setMuted] = useState(false);
  const [ttsWarning, setTtsWarning] = useState<string | null>(null);

  useEffect(() => {
    warmTtsVoices();
    setMuted(readMelPrefs().speakMuted);
  }, []);

  function toggleMute() {
    const next = writeMelPrefs({ speakMuted: !muted });
    setMuted(next.speakMuted);
    if (next.speakMuted) stopSpeaking();
  }

  function speakReply(reply: string) {
    const prefs = readMelPrefs();
    const result = speakText(reply, { muted: prefs.speakMuted });
    if (!result.supported) {
      setTtsWarning(result.error || "TTS indisponível.");
    } else {
      setTtsWarning(null);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setMessages((prev) => [...prev, { role: "USER", content: value }]);
    setText("");
    startTransition(async () => {
      const res = await chatAction(value);
      if (res.ok) {
        setMessages((prev) => [...prev, { role: "ASSISTANT", content: res.reply }]);
        speakReply(res.reply);
      }
    });
  }

  return (
    <div className="stack">
      <div className="panel">
        <div className="toggle-row" style={{ marginBottom: "0.75rem" }}>
          <h2 style={{ margin: 0 }}>Conversar com a Mel</h2>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={toggleMute}
            aria-pressed={muted}
            title={muted ? "Activar voz" : "Silenciar voz"}
          >
            {muted ? "Voz: off" : "Voz: on"}
          </button>
        </div>
        <div className="chat-log" aria-live="polite">
          {messages.map((m, i) => (
            <div
              key={`${m.role}-${i}`}
              className={`bubble ${m.role === "USER" ? "user" : "assistant"}`}
            >
              {m.content}
            </div>
          ))}
        </div>
        {ttsWarning ? <p className="muted small">{ttsWarning}</p> : null}
        {!isTtsSupported() ? (
          <p className="muted small">Sem síntese de voz neste browser — só texto.</p>
        ) : null}
      </div>
      <form className="form-stack" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="chat">Mensagem</label>
          <input
            id="chat"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Quais as tarefas para hoje?"
          />
        </div>
        <button className="btn btn-secondary" type="submit" disabled={pending || !text.trim()}>
          {pending ? "A pensar…" : "Enviar"}
        </button>
      </form>
    </div>
  );
}
