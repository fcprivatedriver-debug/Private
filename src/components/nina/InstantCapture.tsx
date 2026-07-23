"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { instantCapturePhoto, instantCaptureSpeak } from "@/actions/capture";

type Mode = "voice" | "photo" | "write";

type CaptureResult = {
  reply: string;
  detail?: string;
};

const VOICE_EXAMPLES = [
  "Supermercado, 35 euros",
  "Farmácia, 18 euros",
  "McDonald's, 22 euros",
  "Abasteci o carro, 65 euros",
  "Recebi o salário, 1850 euros",
];

export function InstantCapture() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("voice");
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function submitUtterance(utterance: string) {
    const q = utterance.trim();
    if (!q || pending) return;
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
  }

  function toggleListen() {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? (
            window as unknown as {
              SpeechRecognition?: new () => SpeechRecognitionLike;
              webkitSpeechRecognition?: new () => SpeechRecognitionLike;
            }
          ).SpeechRecognition ||
          (
            window as unknown as {
              webkitSpeechRecognition?: new () => SpeechRecognitionLike;
            }
          ).webkitSpeechRecognition
        : undefined;

    if (!SpeechRecognition) {
      setError("O teu browser não tem reconhecimento de voz. Escreve ou usa os exemplos.");
      setMode("write");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-PT";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const said = event.results?.[0]?.[0]?.transcript ?? "";
      setText(said);
      setListening(false);
      if (said) submitUtterance(said);
    };
    recognition.onerror = () => {
      setListening(false);
      setError("Não consegui ouvir. Tenta outra vez ou escreve.");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    setError(null);
    recognition.start();
  }

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

  return (
    <div className="captura stack-lg">
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
            onClick={() => setMode(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "voice" ? (
        <section className="captura-panel">
          <p className="muted" style={{ marginTop: 0 }}>
            Um toque e fala. A Nina interpreta valor, categoria, data, hora e conta.
          </p>
          <button
            type="button"
            className={`captura-mic ${listening ? "is-listening" : ""}`}
            disabled={pending}
            onClick={toggleListen}
            aria-pressed={listening}
          >
            <span className="captura-mic-pulse" aria-hidden />
            {listening ? "A ouvir…" : pending ? "A registar…" : "Falar com a Nina"}
          </button>
          <div className="nina-quick">
            {VOICE_EXAMPLES.map((ex) => (
              <button key={ex} type="button" className="nina-chip" disabled={pending} onClick={() => submitUtterance(ex)}>
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
              placeholder='Ex: "Farmácia, 18 euros"'
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

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEventLike = {
  results?: { [index: number]: { [index: number]: { transcript?: string } } };
};
