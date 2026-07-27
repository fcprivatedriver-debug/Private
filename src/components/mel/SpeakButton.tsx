"use client";

import { useCallback, useEffect, useState } from "react";
import { VoiceCapture } from "@/components/mel/VoiceCapture";
import { cn } from "@/lib/utils";

/**
 * Botão «Falar» — abre captura no sítio e inicia o microfone de imediato.
 * Sem navegação para um segundo ecrã de confirmação.
 */
export function SpeakButton({
  className,
  label = "Falar",
  compact = false,
}: {
  className?: string;
  label?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      <button
        type="button"
        className={cn(compact ? "btn btn-primary btn-sm" : "btn btn-primary", className)}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {label}
      </button>
      {open ? (
        <div className="speak-overlay" role="dialog" aria-modal="true" aria-label="Captura por voz">
          <div className="speak-overlay-backdrop" onClick={close} />
          <div className="speak-overlay-panel anim-rise">
            <div className="speak-overlay-head">
              <h2 className="page-title" style={{ fontSize: "1.4rem", margin: 0 }}>
                A ouvir
              </h2>
              <button type="button" className="btn btn-ghost btn-sm" onClick={close}>
                Fechar
              </button>
            </div>
            <VoiceCapture autoStart onDone={close} />
          </div>
        </div>
      ) : null}
    </>
  );
}
