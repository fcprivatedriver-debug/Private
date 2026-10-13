/**
 * Persistência do convite de instalação PWA.
 * Navegação SPA / remount NÃO deve voltar a mostrar o prompt.
 */

export const PWA_INSTALL_STORAGE_KEY = "addyknow-pwa-install-v1";

/** Cooldown após «Agora não» / fechar — 7 dias */
export const PWA_INSTALL_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export type PwaInstallState = {
  /** Já foi mostrado pelo menos uma vez */
  shownAt?: number;
  /** Utilizador dispensou (Agora não / Entendi) */
  dismissedAt?: number;
  /** Evento appinstalled ou escolha «accepted» */
  installedAt?: number;
};

export function readPwaInstallState(
  storage: Pick<Storage, "getItem"> | null | undefined,
): PwaInstallState {
  if (!storage) return {};
  try {
    const raw =
      storage.getItem(PWA_INSTALL_STORAGE_KEY) ||
      storage.getItem("addyknow-ios-install-dismissed") ||
      storage.getItem("nina-ios-install-dismissed");
    if (!raw) return {};
    // Legado: só "1"
    if (raw === "1") return { dismissedAt: Date.now() };
    const parsed = JSON.parse(raw) as PwaInstallState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writePwaInstallState(
  storage: Pick<Storage, "setItem"> | null | undefined,
  next: PwaInstallState,
): void {
  if (!storage) return;
  try {
    storage.setItem(PWA_INSTALL_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
}

export function isStandaloneDisplay(
  win: Window & { navigator: Navigator & { standalone?: boolean } },
): boolean {
  try {
    if (win.matchMedia("(display-mode: standalone)").matches) return true;
    if (win.matchMedia("(display-mode: fullscreen)").matches) return true;
    if (win.matchMedia("(display-mode: minimal-ui)").matches) return true;
    if (Boolean(win.navigator.standalone)) return true;
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Pode mostrar o toast de instalação?
 * — nunca em standalone / já instalado
 * — nunca durante cooldown após dismiss
 */
export function canShowInstallPrompt(
  state: PwaInstallState,
  opts: { standalone: boolean; now?: number },
): boolean {
  if (opts.standalone) return false;
  if (state.installedAt) return false;
  const now = opts.now ?? Date.now();
  if (state.dismissedAt && now - state.dismissedAt < PWA_INSTALL_COOLDOWN_MS) {
    return false;
  }
  return true;
}
