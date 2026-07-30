"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useTransition } from "react";
import { setBiometricsEnabled, setPin, clearPin } from "@/actions/mel";

export function BiometricsSettings({
  initialEnabled,
  hasPin,
}: {
  initialEnabled: boolean;
  hasPin: boolean;
}) {
  const { update } = useSession();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pin, setPinValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [webauthnSupported, setWebauthnSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.PublicKeyCredential) {
      setWebauthnSupported(true);
    }
  }, []);

  function toggle(next: boolean) {
    startTransition(async () => {
      const res = await setBiometricsEnabled(next);
      if (res.ok) {
        setEnabled(res.biometricsEnabled);
        await update({ biometricsEnabled: res.biometricsEnabled });
        setMessage(
          next
            ? "Biometria activada. No próximo acesso, o telemóvel pode desbloquear a Mel."
            : "Biometria desactivada.",
        );
      }
    });
  }

  function savePin() {
    startTransition(async () => {
      const res = await setPin(pin);
      if (!res.ok) {
        setMessage(res.error);
        return;
      }
      setPinValue("");
      setMessage("PIN guardado para desbloqueio rápido.");
    });
  }

  function removePin() {
    startTransition(async () => {
      await clearPin();
      setMessage("PIN removido.");
    });
  }

  return (
    <div className="stack">
      <div className="toggle-row">
        <div>
          <strong>Acesso biométrico</strong>
          <p className="muted small" style={{ margin: "0.25rem 0 0" }}>
            Após o primeiro login, usa Face ID, Touch ID ou o sensor do dispositivo
            {webauthnSupported ? " (WebAuthn disponível neste browser)" : ""}.
          </p>
        </div>
        <input
          className="switch"
          type="checkbox"
          checked={enabled}
          disabled={pending}
          onChange={(e) => toggle(e.target.checked)}
          aria-label="Activar biometria"
        />
      </div>

      <div className="field">
        <label htmlFor="pin">PIN de desbloqueio (4–8 dígitos)</label>
        <input
          id="pin"
          inputMode="numeric"
          pattern="\d{4,8}"
          maxLength={8}
          value={pin}
          onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
          placeholder={hasPin ? "••••" : "Ex.: 2580"}
        />
      </div>
      <div className="inline-actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={pending || pin.length < 4}
          onClick={savePin}
        >
          Guardar PIN
        </button>
        {hasPin ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={pending}
            onClick={removePin}
          >
            Remover PIN
          </button>
        ) : null}
      </div>
      {message ? <p className="muted small">{message}</p> : null}
    </div>
  );
}
