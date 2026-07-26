/**
 * Provider registry — Engines comunicam só com Providers.
 * Trocar um fornecedor não altera a lógica dos engines.
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

/** Catálogo estático dos providers activos (extensível). */
export function listProviders(): ProviderDescriptor[] {
  return [
    { kind: "shopping", id: "continente", label: "Continente", health: "prototype" },
    { kind: "shopping", id: "pingo_doce", label: "Pingo Doce", health: "prototype" },
    { kind: "fuel", id: "fuel_prototype_pt", label: "Postos PT (protótipo)", health: "prototype" },
    { kind: "ev", id: "ev_prototype_pt", label: "Carregadores PT (protótipo)", health: "prototype" },
    { kind: "calendar", id: "google", label: "Google Calendar", health: "needs_auth" },
    { kind: "navigation", id: "google_maps", label: "Google Maps", health: "ready" },
    { kind: "navigation", id: "waze", label: "Waze", health: "ready" },
    { kind: "navigation", id: "apple_maps", label: "Apple Maps", health: "ready" },
    { kind: "reminders", id: "system", label: "Lembretes do sistema", health: "prototype" },
    { kind: "weather", id: "weather_future", label: "Meteorologia", health: "unavailable" },
    { kind: "traffic", id: "traffic_future", label: "Trânsito", health: "unavailable" },
  ];
}
