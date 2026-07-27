/**
 * Capability voice.speak (cliente) — Web Speech Synthesis PT-PT.
 */

export type SpeakResult = {
  ok: boolean;
  supported: boolean;
  error?: string;
};

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function isTtsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickPtVoice(): SpeechSynthesisVoice | null {
  if (!isTtsSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  const ptPt =
    voices.find((v) => v.lang?.toLowerCase() === "pt-pt") ||
    voices.find((v) => v.lang?.toLowerCase().startsWith("pt")) ||
    null;
  return ptPt;
}

/** Garante que as vozes estão carregadas (Chrome carrega async). */
export function warmTtsVoices(): void {
  if (!isTtsSupported()) return;
  window.speechSynthesis.getVoices();
  if (typeof window !== "undefined") {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }
}

export function stopSpeaking(): void {
  if (!isTtsSupported()) return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
}

/**
 * Lê texto em voz alta (pt-PT). Respeita ciclo de vida: cancela anterior.
 * Em Safari iOS, deve ser chamado a partir de gesto do utilizador na 1.ª vez.
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
  const clean = text.replace(/\n+/g, ". ").trim();
  if (!clean) return { ok: true, supported: true };

  stopSpeaking();
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = "pt-PT";
  u.rate = 1.02;
  const voice = pickPtVoice();
  if (voice) u.voice = voice;
  currentUtterance = u;

  const onVis = () => {
    if (document.hidden) {
      window.speechSynthesis.pause();
    } else {
      window.speechSynthesis.resume();
    }
  };
  document.addEventListener("visibilitychange", onVis);
  u.onend = () => {
    document.removeEventListener("visibilitychange", onVis);
    if (currentUtterance === u) currentUtterance = null;
  };
  u.onerror = () => {
    document.removeEventListener("visibilitychange", onVis);
    if (currentUtterance === u) currentUtterance = null;
  };

  window.speechSynthesis.speak(u);
  return { ok: true, supported: true };
}
