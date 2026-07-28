/**
 * Preferências Mel no cliente (localStorage) — sem alterar Prisma.
 */

export type MelClientPrefs = {
  /** Silenciar TTS da Mel */
  speakMuted: boolean;
  /**
   * Ao concluir tarefa: true = remover da agenda; false = marcar concluído (default).
   */
  removeCalendarOnTaskDone: boolean;
  /** Lembretes Web Notification 15 min antes (requer permissão). */
  pushRemindersEnabled: boolean;
};

const KEY = "mel.prefs.v1";

const defaults: MelClientPrefs = {
  speakMuted: false,
  removeCalendarOnTaskDone: false,
  pushRemindersEnabled: false,
};

export function readMelPrefs(): MelClientPrefs {
  if (typeof window === "undefined") return { ...defaults };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function writeMelPrefs(patch: Partial<MelClientPrefs>): MelClientPrefs {
  const next = { ...readMelPrefs(), ...patch };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  }
  return next;
}
