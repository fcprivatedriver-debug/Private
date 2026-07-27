"use client";

import { FormEvent, useEffect, useRef, useState, useTransition } from "react";
import { captureAction } from "@/actions/mel";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function VoiceCapture({ autoStart = false }: { autoStart?: boolean }) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  const [pending, startTransition] = useTransition();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [speechAvailable, setSpeechAvailable] = useState(false);

  useEffect(() => {
    setSpeechAvailable(Boolean(getSpeechRecognition()));
  }, []);

  useEffect(() => {
    if (autoStart && speechAvailable) {
      const t = window.setTimeout(() => startListening(), 400);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, speechAvailable]);

  function startListening() {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setReply("O teu browser não suporta reconhecimento de voz. Escreve abaixo.");
      setOk(false);
      return;
    }
    const recognition = new Ctor();
    recognition.lang = "pt-PT";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || "";
      setText(transcript);
      submitUtterance(transcript);
    };
    recognition.onerror = () => {
      setListening(false);
      setReply("Não consegui ouvir. Tenta de novo ou escreve.");
      setOk(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  function submitUtterance(utterance: string) {
    const value = utterance.trim();
    if (!value) return;
    startTransition(async () => {
      const result = await captureAction(value);
      setReply(result.reply);
      setOk(result.ok);
      if (result.ok) setText("");
    });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submitUtterance(text);
  }

  return (
    <div className="stack">
      <div className="capture-stage">
        <button
          type="button"
          className={`btn-mic${listening ? " listening" : ""}`}
          onClick={listening ? stopListening : startListening}
          aria-pressed={listening}
          aria-label={listening ? "Parar" : "Falar"}
        >
          {listening ? "…" : "Mic"}
        </button>
        <p className="muted">
          {listening
            ? "Estou a ouvir…"
            : speechAvailable
              ? "Toca e fala, ou escreve abaixo."
              : "Escreve o que queres registar (voz indisponível neste browser)."}
        </p>
        <p className="small muted">
          Exemplos: «cria tarefa comprar pão» · «marca reunião amanhã às 15»
        </p>
      </div>

      <form className="form-stack" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="utterance">Texto</label>
          <textarea
            id="utterance"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="O que queres que a Mel faça?"
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={pending || !text.trim()}>
          {pending ? "A processar…" : "Enviar"}
        </button>
      </form>

      {reply ? (
        <p className={ok ? "reply-ok" : "reply-err"} role="status">
          {reply}
        </p>
      ) : null}
    </div>
  );
}
