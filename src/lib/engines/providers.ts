/**
 * Provider registry — Engines comunicam só com Providers.
 */

export type ProviderKind =
  | "shopping"
  | "fuel"
  | "ev"
  | "calendar"
  | "weather"
  | "traffic"
  | "navigation"
  | "reminders";

export type ProviderDescriptor = {
  kind: ProviderKind;
  id: string;
  label: string;
  health: "ready" | "prototype" | "needs_auth" | "unavailable";
};

/** Catálogo estático dos providers (estado honesto). */
export function listProviders(): ProviderDescriptor[] {
  return [
    { kind: "shopping", id: "continente", label: "Continente", health: "needs_auth" },
    { kind: "shopping", id: "pingo_doce", label: "Pingo Doce", health: "needs_auth" },
    { kind: "shopping", id: "auchan", label: "Auchan", health: "needs_auth" },
    { kind: "fuel", id: "dgeg", label: "DGEG combustíveis", health: "needs_auth" },
    { kind: "ev", id: "mobie", label: "MOBI.E Lisboa (CC0 cache)", health: "prototype" },
    { kind: "calendar", id: "google", label: "Google Calendar", health: "needs_auth" },
    { kind: "navigation", id: "google_maps", label: "Google Maps", health: "ready" },
    { kind: "navigation", id: "waze", label: "Waze", health: "ready" },
    { kind: "navigation", id: "apple_maps", label: "Apple Maps", health: "ready" },
    { kind: "reminders", id: "system", label: "Lembretes (deep-link)", health: "needs_auth" },
    { kind: "weather", id: "weather_future", label: "Meteorologia", health: "unavailable" },
    { kind: "traffic", id: "traffic_future", label: "Trânsito", health: "unavailable" },
  ];
}
