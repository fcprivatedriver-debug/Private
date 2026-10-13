"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { APP_NAME } from "@/config/brand";
import {
  canShowInstallPrompt,
  isStandaloneDisplay,
  readPwaInstallState,
  writePwaInstallState,
  type PwaInstallState,
} from "@/lib/pwa/install-prompt";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

const SW_RELOAD_KEY = "addyknow-sw-reloading";

export function PwaRegister() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const installStateRef = useRef<PwaInstallState>({});

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const host = window.location.hostname;
    const ephemeral =
      host.endsWith(".trycloudflare.com") ||
      host.endsWith(".loca.lt") ||
      host.endsWith(".localtunnel.me") ||
      host.endsWith(".lhr.life") ||
      host.endsWith(".localhost.run") ||
      host.endsWith(".serveo.net") ||
      host.endsWith(".serveousercontent.com") ||
      host === "localhost" ||
      host === "127.0.0.1";

    // Ephemeral preview hosts: unregister any SW so Offline traps cannot stick
    if (ephemeral) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      if ("caches" in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
      return;
    }

    let registration: ServiceWorkerRegistration | undefined;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        registration = reg;
        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
          setUpdateReady(true);
        }
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              setWaitingWorker(worker);
              setUpdateReady(true);
            }
          });
        });
      })
      .catch(() => {
        /* SW opcional */
      });

    const id = window.setInterval(() => {
      registration?.update().catch(() => {});
    }, 60_000);

    const onControllerChange = () => {
      if (sessionStorage.getItem(SW_RELOAD_KEY)) return;
      sessionStorage.setItem(SW_RELOAD_KEY, "1");
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      window.clearInterval(id);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone = isStandaloneDisplay(window);
    const state = readPwaInstallState(window.localStorage);
    installStateRef.current = state;

    // App já instalada / modo standalone — nunca pedir instalação.
    if (standalone) {
      if (!state.installedAt) {
        const next = { ...state, installedAt: Date.now() };
        installStateRef.current = next;
        writePwaInstallState(window.localStorage, next);
      }
      return;
    }

    const allow = () =>
      canShowInstallPrompt(installStateRef.current, {
        standalone: isStandaloneDisplay(window),
      });

    const markShown = () => {
      const next = {
        ...installStateRef.current,
        shownAt: Date.now(),
      };
      installStateRef.current = next;
      writePwaInstallState(window.localStorage, next);
    };

    const onBip = (e: Event) => {
      e.preventDefault();
      const ev = e as BeforeInstallPromptEvent;
      setDeferred(ev);
      // Só mostrar se política permitir — NÃO em cada remount/navegação.
      if (!allow()) return;
      markShown();
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    const onInstalled = () => {
      const next = {
        ...installStateRef.current,
        installedAt: Date.now(),
      };
      installStateRef.current = next;
      writePwaInstallState(window.localStorage, next);
      setShowInstall(false);
      setShowIosTip(false);
      setDeferred(null);
    };
    window.addEventListener("appinstalled", onInstalled);

    // iOS: tip manual (sem beforeinstallprompt) — mesmo cooldown/persistência.
    if (isIos() && allow()) {
      const path = window.location.pathname;
      const onAuth = /\/(login|registo)\/?$/.test(path);
      if (!onAuth) {
        // Atraso breve: não interceptar a primeira interacção ao entrar.
        const t = window.setTimeout(() => {
          if (!allow()) return;
          markShown();
          setShowIosTip(true);
        }, 8_000);
        return () => {
          window.clearTimeout(t);
          window.removeEventListener("beforeinstallprompt", onBip);
          window.removeEventListener("appinstalled", onInstalled);
        };
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismissInstall = useCallback(() => {
    const next = {
      ...installStateRef.current,
      dismissedAt: Date.now(),
    };
    installStateRef.current = next;
    if (typeof window !== "undefined") {
      writePwaInstallState(window.localStorage, next);
    }
    setShowInstall(false);
    setShowIosTip(false);
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    setShowInstall(false);
    if (choice.outcome === "accepted") {
      const next = {
        ...installStateRef.current,
        installedAt: Date.now(),
      };
      installStateRef.current = next;
      if (typeof window !== "undefined") {
        writePwaInstallState(window.localStorage, next);
      }
    } else {
      dismissInstall();
    }
  }, [deferred, dismissInstall]);

  const applyUpdate = useCallback(() => {
    waitingWorker?.postMessage("SKIP_WAITING");
    setUpdateReady(false);
  }, [waitingWorker]);

  // Auto-apply updates quietly after a short delay (in-place update, not reinstall)
  useEffect(() => {
    if (!updateReady || !waitingWorker) return;
    const t = window.setTimeout(() => {
      waitingWorker.postMessage("SKIP_WAITING");
    }, 2500);
    return () => window.clearTimeout(t);
  }, [updateReady, waitingWorker]);

  return (
    <>
      <div id="nina-pwa-splash" className="nina-pwa-splash" aria-hidden>
        <div className="nina-pwa-splash-mark">{APP_NAME}</div>
      </div>

      {updateReady ? (
        <div className="nina-pwa-toast" role="status">
          <span>Nova versão da {APP_NAME} disponível.</span>
          <button type="button" className="btn btn-sm btn-primary" onClick={applyUpdate}>
            Atualizar
          </button>
        </div>
      ) : null}

      {showInstall && deferred ? (
        <div
          className="nina-pwa-toast nina-pwa-install"
          role="dialog"
          aria-label={`Instalar ${APP_NAME}`}
          data-testid="pwa-install-prompt"
        >
          <div>
            <strong>Instalar {APP_NAME}</strong>
            <p className="muted small" style={{ margin: "0.15rem 0 0" }}>
              Adiciona ao ecrã principal e usa como app.
            </p>
          </div>
          <div className="nina-pwa-toast-actions">
            <button type="button" className="btn btn-sm btn-ghost" onClick={dismissInstall}>
              Agora não
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={install}>
              Instalar
            </button>
          </div>
        </div>
      ) : null}

      {showIosTip && !showInstall ? (
        <div
          className="nina-pwa-toast nina-pwa-install"
          role="dialog"
          aria-label="Adicionar ao ecrã"
          data-testid="pwa-ios-install-tip"
        >
          <div>
            <strong>Adicionar ao ecrã principal</strong>
            <p className="muted small" style={{ margin: "0.15rem 0 0" }}>
              No Safari: Partilhar → «Adicionar ao Ecrã Principal» como {APP_NAME}.
            </p>
          </div>
          <button type="button" className="btn btn-sm btn-ghost" onClick={dismissInstall}>
            Entendi
          </button>
        </div>
      ) : null}
    </>
  );
}
