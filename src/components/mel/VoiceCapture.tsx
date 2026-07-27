"use client";

import { FormEvent, useEffect, useRef, useState, useTransition } from "react";
import { captureAction } from "@/actions/mel";
import { readMelPrefs } from "@/lib/mel-prefs";
import { speakText, stopSpeaking, warmTtsVoices, isTtsSupported } from "@/modules/voice/speak-client";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: {
    results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>;
  }) => void) | null;
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

export function VoiceCapture({
  autoStart = false,
  onDone,
}: {
  autoStart?: boolean;
  onDone?: () => void;
}) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  const [pending, startTransition] = useTransition();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [ttsWarning, setTtsWarning] = useState<string | null>(null);
  const startedRef = useRef(false);
  const submittedRef = useRef(false);
  const latestTextRef = useRef("");

  useEffect(() => {
    setSpeechAvailable(Boolean(getSpeechRecognition()));
    warmTtsVoices();
    return () => {
      recognitionRef.current?.stop();
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (autoStart && speechAvailable && !startedRef.current) {
      startedRef.current = true;
      const t = window.setTimeout(() => startListening(), 200);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, speechAvailable]);

  function speakReply(message: string) {
    const prefs = readMelPrefs();
    const result = speakText(message, { muted: prefs.speakMuted });
    if (!result.supported) {
      setTtsWarning(result.error || "TTS indisponível — resposta só em texto.");
    } else {
      setTtsWarning(null);
    }
  }

  function submitUtterance(utterance: string) {
    const value = utterance.trim();
    if (!value || submittedRef.current) return;
    submittedRef.current = true;
    startTransition(async () => {
      const result = await captureAction(value);
      setReply(result.reply);
      setOk(result.ok);
      speakReply(result.reply);
      if (result.ok) {
        setText("");
        latestTextRef.current = "";
        if (onDone) window.setTimeout(() => onDone(), 1600);
      } else {
        submittedRef.current = false;
      }
    });
  }

  function startListening() {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setReply("O teu browser não suporta reconhecimento de voz. Escreve abaixo.");
      setOk(false);
      return;
    }
    setMicDenied(false);
    submittedRef.current = false;
    const recognition = new Ctor();
    recognition.lang = "pt-PT";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const transcript = last?.[0]?.transcript || "";
      latestTextRef.current = transcript;
      setText(transcript);
      if (last && (last as { isFinal?: boolean }).isFinal) {
        submitUtterance(transcript);
      }
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setMicDenied(true);
        setReply(
          "Permissão de microfone negada. Podes escrever abaixo ou activar o microfone nas definições do browser.",
        );
      } else if (event.error !== "aborted") {
        setReply("Não consegui ouvir. Tenta de novo ou escreve.");
      }
      setOk(false);
    };
    recognition.onend = () => {
      setListening(false);
      if (!submittedRef.current && latestTextRef.current.trim()) {
        submitUtterance(latestTextRef.current);
      }
    };
    recognitionRef.current = recognition;
    setListening(true);
    setReply(null);
    try {
      recognition.start();
    } catch {
      setListening(false);
      setReply("Não foi possível iniciar o microfone.");
      setOk(false);
    }
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    stopListening();
    submittedRef.current = false;
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
          {micDenied
            ? "Microfone bloqueado neste browser."
            : listening
              ? "Estou a ouvir… fala agora."
              : speechAvailable
                ? "Toca e fala, ou escreve abaixo."
                : "Escreve o que queres (voz indisponível neste browser)."}
        </p>
        <p className="small muted">
          Exemplos: «quais as tarefas para hoje» · «cria tarefa comprar pão»
        </p>
      </div>

      <form className="form-stack" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="utterance">Texto</label>
          <textarea
            id="utterance"
            rows={3}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              latestTextRef.current = e.target.value;
            }}
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
      {ttsWarning ? (
        <p className="muted small" role="status">
          {ttsWarning}
        </p>
      ) : null}
      {!isTtsSupported() ? (
        <p className="muted small">Aviso: sem TTS neste dispositivo — respostas só em texto.</p>
      ) : null}
    </div>
  );
}
