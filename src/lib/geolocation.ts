/**
 * Geolocation do browser/PWA — sem fingir Lisboa.
 * A localização só deve ser pedida para funções de proximidade.
 */

export type GeoPosition = {
  lat: number;
  lng: number;
  accuracyMeters?: number;
  timestamp: number;
};

export type GeoResult =
  | { ok: true; position: GeoPosition }
  | { ok: false; reason: "unsupported" | "denied" | "unavailable" | "timeout"; message: string };

const GEO_DENIED_MSG =
  "Precisamos da tua localização para procurar postos e carregadores próximos. Podes activá-la nas definições do browser ou indicar um local manualmente mais tarde.";

export function isGeolocationSupported(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

export function requestUserLocation(opts?: {
  timeoutMs?: number;
  highAccuracy?: boolean;
}): Promise<GeoResult> {
  if (!isGeolocationSupported()) {
    return Promise.resolve({
      ok: false,
      reason: "unsupported",
      message: "Este dispositivo/browser não permite obter a localização.",
    });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          ok: true,
          position: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracyMeters: pos.coords.accuracy,
            timestamp: pos.timestamp,
          },
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          resolve({ ok: false, reason: "denied", message: GEO_DENIED_MSG });
        } else if (err.code === err.TIMEOUT) {
          resolve({
            ok: false,
            reason: "timeout",
            message: "Não consegui obter a localização a tempo. Tenta novamente.",
          });
        } else {
          resolve({
            ok: false,
            reason: "unavailable",
            message: "Localização indisponível neste momento.",
          });
        }
      },
      {
        enableHighAccuracy: opts?.highAccuracy ?? true,
        timeout: opts?.timeoutMs ?? 12_000,
        maximumAge: 60_000,
      },
    );
  });
}
