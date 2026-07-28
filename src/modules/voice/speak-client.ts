/**
 * Capability voice.speak (cliente) — Web Speech Synthesis PT-PT.
 * Inclui unlock para iOS Safari e fila com pausas naturais.
 */

export type SpeakResult = {
  ok: boolean;
  supported: boolean;
  error?: string;
};

let currentUtterance: SpeechSynthesisUtterance | null = null;
let unlocked = false;
let queue: string[] = [];
let playing = false;
let visHandler: (() => void) | null = null;

export function isTtsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickPtVoice(): SpeechSynthesisVoice | null {
  if (!isTtsSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang?.toLowerCase() === "pt-pt") ||
    voices.find((v) => v.lang?.toLowerCase().startsWith("pt")) ||
    null
  );
}

/** Garante que as vozes estão carregadas (Chrome carrega async). */
export function warmTtsVoices(): void {
  if (!isTtsSupported()) return;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

/**
 * Desbloqueia TTS no iOS Safari — chamar no gesto do utilizador (click).
 */
export function unlockTts(): void {
  if (!isTtsSupported() || unlocked) return;
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    u.rate = 2;
    window.speechSynthesis.speak(u);
    window.speechSynthesis.cancel();
    unlocked = true;
  } catch {
    /* ignore */
  }
}

export function stopSpeaking(): void {
  queue = [];
  playing = false;
  if (!isTtsSupported()) return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
  if (visHandler) {
    document.removeEventListener("visibilitychange", visHandler);
    visHandler = null;
  }
}

function attachVisibility(): void {
  if (visHandler) return;
  visHandler = () => {
    if (!isTtsSupported()) return;
    if (document.hidden) window.speechSynthesis.pause();
    else window.speechSynthesis.resume();
  };
  document.addEventListener("visibilitychange", visHandler);
}

function speakChunk(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!isTtsSupported()) {
      resolve();
      return;
    }
    const clean = text.replace(/\n+/g, ". ").trim();
    if (!clean) {
      resolve();
      return;
    }
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "pt-PT";
    u.rate = 1.02;
    const voice = pickPtVoice();
    if (voice) u.voice = voice;
    currentUtterance = u;
    attachVisibility();
    u.onend = () => {
      if (currentUtterance === u) currentUtterance = null;
      resolve();
    };
    u.onerror = () => {
      if (currentUtterance === u) currentUtterance = null;
      resolve();
    };
    window.speechSynthesis.speak(u);
  });
}

async function drainQueue(): Promise<void> {
  if (playing) return;
  playing = true;
  while (queue.length) {
    const next = queue.shift()!;
    await speakChunk(next);
    // Pausa natural entre blocos de prioridade
    await new Promise((r) => setTimeout(r, 280));
  }
  playing = false;
  if (visHandler) {
    document.removeEventListener("visibilitychange", visHandler);
    visHandler = null;
  }
}

/**
 * Lê texto em voz alta (pt-PT). Respeita mute e ciclo de vida (pause/resume).
 */
export function speakText(text: string, opts?: { muted?: boolean }): SpeakResult {
  if (opts?.muted) {
    return { ok: true, supported: isTtsSupported() };
  }
  if (!isTtsSupported()) {
    return {
      ok: false,
      supported: false,
      error: "Este browser não suporta síntese de voz. A resposta fica só em texto.",
    };
  }
  unlockTts();
  stopSpeaking();
  queue = [text];
  void drainQueue();
  return { ok: true, supported: true };
}

/**
 * Lê vários blocos em sequência com pausas (ex.: high → medium → low).
 */
export function speakSequence(
  parts: string[],
  opts?: { muted?: boolean },
): SpeakResult {
  if (opts?.muted) {
    return { ok: true, supported: isTtsSupported() };
  }
  if (!isTtsSupported()) {
    return {
      ok: false,
      supported: false,
      error: "Este browser não suporta síntese de voz. A resposta fica só em texto.",
    };
  }
  unlockTts();
  stopSpeaking();
  queue = parts.map((p) => p.trim()).filter(Boolean);
  void drainQueue();
  return { ok: true, supported: true };
}
