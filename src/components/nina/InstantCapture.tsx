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
  "Quanto gastei este mês?",
  "Onde posso poupar?",
  "Combustível mais barato perto de mim?",
  "Compara a minha lista.",
];

const VOICE_EXAMPLES_FULL = [
  "Gastei 24 euros na BP",
  "Adiciona leite Mimosa",
  "Onde abasteço?",
  "Tenho 30% de bateria",
  "Marca cabeleireiro amanhã",
  "Lembra-me daqui a duas horas",
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
  compact = false,
}: {
  initialMode?: Mode;
  autoStart?: boolean;
  /** UI enxuta para ecrã Falar */
  compact?: boolean;
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
          if ("deepLink" in res && res.deepLink) {
            window.open(res.deepLink, "_blank", "noopener,noreferrer");
          }
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
      if (res.ok === false) {
        setError(
          res.receiptUrl
            ? `${res.error} Podes registar o valor em Despesas e anexar a fatura aí.`
            : res.error,
        );
        return;
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

  const examples = compact ? VOICE_EXAMPLES : VOICE_EXAMPLES_FULL;

  return (
    <div className={`captura stack-lg ${listening ? "is-listening-mode" : ""} ${compact ? "captura-compact" : ""}`}>
      {!compact ? (
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
      ) : mode === "voice" ? (
        <div className="captura-modes captura-modes-compact" role="tablist" aria-label="Método">
          {(
            [
              ["voice", "Voz"],
              ["write", "Texto"],
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
      ) : null}

      {mode === "voice" ? (
        <section className={`captura-panel captura-voice-fast ${compact ? "is-flat" : ""}`}>
          {!compact ? (
            <p className="muted" style={{ marginTop: 0 }}>
              {autoStart
                ? "Diz o gasto agora — a MEL regista sozinha."
                : "Um toque e fala. Exemplos: «BP 20 euros», «Continente 58 euros»."}
            </p>
          ) : null}
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
                  : compact
                    ? "Falar"
                    : "Falar com a MEL"}
          </button>
          {text ? <p className="captura-transcript">«{text}»</p> : null}
          <div className="nina-quick">
            {examples.map((ex) => (
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
        <section className={`captura-panel ${compact ? "is-flat" : ""}`}>
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
              placeholder={compact ? "Escreve a tua pergunta…" : 'Ex: "gastei 24 euros na BP"'}
              aria-label="Texto para a MEL"
              disabled={pending}
              autoFocus
            />
            <button className="btn btn-primary" type="submit" disabled={pending || !text.trim()}>
              Enviar
            </button>
          </form>
        </section>
      ) : null}

      {mode === "photo" ? (
        <section className={`captura-panel ${compact ? "is-flat" : ""}`}>
          {!compact ? (
            <p className="muted" style={{ marginTop: 0 }}>
              Fotografa faturas, talões ou contas.
            </p>
          ) : null}
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
            {pending ? "A processar…" : "Anexar fatura"}
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

      {!compact ? (
        <section className="captura-alt panel">
          <div className="panel-body">
            <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Outras formas</h2>
            <ul className="captura-alt-list">
              <li>
                <Link href="/pt/ligacoes">Importação automática</Link>
              </li>
              <li>
                <Link href="/pt/ocr">OCR clássico</Link>
              </li>
              <li>
                <Link href="/pt/despesas/nova">Nova despesa</Link>
              </li>
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}
