"use client";

import { useEffect, useState, useCallback } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function PwaRegister() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

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
      if (sessionStorage.getItem("nina-sw-reloading")) return;
      sessionStorage.setItem("nina-sw-reloading", "1");
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      window.clearInterval(id);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  useEffect(() => {
    if (isStandalone()) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    if (isIos()) {
      const dismissed = localStorage.getItem("nina-ios-install-dismissed");
      if (!dismissed) setShowIosTip(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setShowInstall(false);
  }, [deferred]);

  const applyUpdate = useCallback(() => {
    waitingWorker?.postMessage("SKIP_WAITING");
    setUpdateReady(false);
  }, [waitingWorker]);

  // Auto-apply updates quietly after a short delay (user asked for auto-update)
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
        <div className="nina-pwa-splash-mark">Nina</div>
      </div>

      {updateReady ? (
        <div className="nina-pwa-toast" role="status">
          <span>Nova versão da Nina disponível.</span>
          <button type="button" className="btn btn-sm btn-primary" onClick={applyUpdate}>
            Atualizar
          </button>
        </div>
      ) : null}

      {showInstall && deferred ? (
        <div className="nina-pwa-toast nina-pwa-install" role="dialog" aria-label="Instalar Nina">
          <div>
            <strong>Instalar Nina</strong>
            <p className="muted small" style={{ margin: "0.15rem 0 0" }}>
              Adiciona ao ecrã principal e usa como app.
            </p>
          </div>
          <div className="nina-pwa-toast-actions">
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShowInstall(false)}>
              Agora não
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={install}>
              Instalar
            </button>
          </div>
        </div>
      ) : null}

      {showIosTip && !showInstall ? (
        <div className="nina-pwa-toast nina-pwa-install" role="dialog" aria-label="Adicionar ao ecrã">
          <div>
            <strong>Adicionar ao ecrã principal</strong>
            <p className="muted small" style={{ margin: "0.15rem 0 0" }}>
              No Safari: Partilhar → «Adicionar ao Ecrã Principal».
            </p>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => {
              localStorage.setItem("nina-ios-install-dismissed", "1");
              setShowIosTip(false);
            }}
          >
            Entendi
          </button>
        </div>
      ) : null}
    </>
  );
}
