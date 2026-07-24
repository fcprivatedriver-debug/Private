"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { instantCapturePhoto, instantCaptureSpeak } from "@/actions/capture";

type Mode = "voice" | "photo" | "write";

type CaptureResult = {
  reply: string;
  detail?: string;
};

const VOICE_EXAMPLES = [
  "BP 20 euros",
  "Continente 58 euros",
  "McDonald's 18 euros",
  "Supermercado, 35 euros",
  "Recebi o salário, 1850 euros",
];

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous?: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event?: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEventLike = {
  results?: { [index: number]: { [index: number]: { transcript?: string } } };
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition;
}

export function InstantCapture({
  initialMode = "voice",
  autoStart = false,
}: {
  initialMode?: Mode;
  autoStart?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [needsTap, setNeedsTap] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const autoTried = useRef(false);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const listeningRef = useRef(listening);
  listeningRef.current = listening;

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const submitUtterance = useCallback(
    (utterance: string) => {
      const q = utterance.trim();
      if (!q || pendingRef.current) return;
      setError(null);
      setResult(null);
      start(async () => {
        const res = await instantCaptureSpeak(q);
        if (res.ok) {
          setResult({ reply: res.reply, detail: res.detail });
          setText("");
          router.refresh();
        } else {
          setError(res.error);
        }
      });
    },
    [router],
  );

  const startListening = useCallback(
    (fromAuto: boolean) => {
      const SpeechRecognition = getSpeechRecognition();
      if (!SpeechRecognition) {
        setError("O teu browser não tem reconhecimento de voz. Escreve ou usa os exemplos.");
        setMode("write");
        setNeedsTap(false);
        return;
      }

      if (recognitionRef.current && listeningRef.current) {
        recognitionRef.current.stop();
        setListening(false);
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognition.lang = "pt-PT";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.onresult = (event: SpeechRecognitionEventLike) => {
          const said = event.results?.[0]?.[0]?.transcript ?? "";
          setText(said);
          setListening(false);
          setNeedsTap(false);
          if (said) submitUtterance(said);
        };
        recognition.onerror = (event?: { error?: string }) => {
          setListening(false);
          if (fromAuto || event?.error === "not-allowed") {
            setNeedsTap(true);
            setError(
              fromAuto
                ? "Toca no microfone para começar a falar."
                : "Não consegui ouvir. Toca outra vez ou escreve.",
            );
          } else {
            setError("Não consegui ouvir. Tenta outra vez ou escreve.");
          }
        };
        recognition.onend = () => setListening(false);
        recognitionRef.current = recognition;
        setListening(true);
        setError(null);
        recognition.start();
      } catch {
        setNeedsTap(true);
        setError("Toca no microfone para começar a falar.");
      }
    },
    [submitUtterance],
  );

  function onPhotoSelected(file: File | null) {
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
    setResult(null);
    const fd = new FormData();
    fd.set("file", file);
    start(async () => {
      const res = await instantCapturePhoto(fd);
      if (res.ok) {
        setResult({ reply: res.reply, detail: res.detail });
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  useEffect(() => {
    if (!autoStart || autoTried.current) return;
    autoTried.current = true;
    if (initialMode === "voice") {
      const t = window.setTimeout(() => startListening(true), 280);
      return () => window.clearTimeout(t);
    }
    if (initialMode === "photo") {
      const t = window.setTimeout(() => fileRef.current?.click(), 350);
      return () => window.clearTimeout(t);
    }
  }, [autoStart, initialMode, startListening]);

  return (
    <div className={`captura stack-lg ${listening ? "is-listening-mode" : ""}`}>
      <div className="captura-modes" role="tablist" aria-label="Método de captura">
        {(
          [
            ["voice", "Falar"],
            ["photo", "Fotografar"],
            ["write", "Escrever"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            className={`captura-mode ${mode === id ? "active" : ""}`}
            onClick={() => {
              setMode(id);
              setNeedsTap(false);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "voice" ? (
        <section className="captura-panel captura-voice-fast">
          <p className="muted" style={{ marginTop: 0 }}>
            {autoStart
              ? "Diz o gasto agora — a Nina regista sozinha."
              : "Um toque e fala. Exemplos: «BP 20 euros», «Continente 58 euros»."}
          </p>
          <button
            type="button"
            className={`captura-mic ${listening ? "is-listening" : ""} ${needsTap ? "needs-tap" : ""}`}
            disabled={pending}
            onClick={() => startListening(false)}
            aria-pressed={listening}
          >
            <span className="captura-mic-pulse" aria-hidden />
            {listening
              ? "A ouvir…"
              : pending
                ? "A registar…"
                : needsTap
                  ? "Toca para falar"
                  : "Falar com a Nina"}
          </button>
          {text ? <p className="captura-transcript">«{text}»</p> : null}
          <div className="nina-quick">
            {VOICE_EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                className="nina-chip"
                disabled={pending}
                onClick={() => submitUtterance(ex)}
              >
                {ex}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {mode === "write" ? (
        <section className="captura-panel">
          <form
            className="nina-composer"
            onSubmit={(e) => {
              e.preventDefault();
              submitUtterance(text);
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder='Ex: "BP 20 euros"'
              aria-label="Texto para registar"
              disabled={pending}
              autoFocus
            />
            <button className="btn btn-primary" type="submit" disabled={pending || !text.trim()}>
              Registar
            </button>
          </form>
        </section>
      ) : null}

      {mode === "photo" ? (
        <section className="captura-panel">
          <p className="muted" style={{ marginTop: 0 }}>
            Fotografa faturas, talões ou contas. A Nina lê com OCR, classifica e arquiva a imagem no
            movimento.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            className="sr-only"
            onChange={(e) => onPhotoSelected(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className="btn btn-primary captura-photo-btn"
            disabled={pending}
            onClick={() => fileRef.current?.click()}
          >
            {pending ? "A ler a fatura…" : "Abrir câmara / galeria"}
          </button>
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Pré-visualização da fatura" className="captura-preview" />
          ) : null}
        </section>
      ) : null}

      {result ? (
        <div className="captura-result" role="status">
          <strong>{result.reply}</strong>
          {result.detail ? <span>{result.detail}</span> : null}
        </div>
      ) : null}
      {error ? <p className="text-expense">{error}</p> : null}

      <section className="captura-alt panel">
        <div className="panel-body">
          <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Outras formas — o mesmo resultado</h2>
          <ul className="captura-alt-list">
            <li>
              <Link href="/pt/ligacoes">Importação automática</Link> via Ligações (email, banco,
              supermercados…)
            </li>
            <li>
              <Link href="/pt/ocr">OCR clássico</Link> com revisão manual dos campos
            </li>
            <li>
              <Link href="/pt/dashboard">Conversar</Link> quando quiseres uma resposta mais longa
            </li>
          </ul>
          <p className="muted small" style={{ marginBottom: 0 }}>
            O utilizador vive a sua vida. A Nina trata do resto.
          </p>
        </div>
      </section>
    </div>
  );
}
