import type { ServiceMeta } from "../services/types";

export type NavApp = "google_maps" | "waze" | "apple_maps";

export type NavDestination = {
  label: string;
  lat?: number;
  lng?: number;
  address?: string;
};

export interface NavigationService {
  meta: ServiceMeta;
  preferredApp: NavApp;
  open(dest: NavDestination, app?: NavApp): { deepLink: string; reply: string };
}

function buildLink(app: NavApp, dest: NavDestination): string {
  const q =
    dest.lat != null && dest.lng != null
      ? `${dest.lat},${dest.lng}`
      : dest.address || dest.label;
  if (app === "waze") {
    if (dest.lat != null && dest.lng != null) {
      return `https://waze.com/ul?ll=${dest.lat},${dest.lng}&navigate=yes`;
    }
    return `https://waze.com/ul?q=${encodeURIComponent(q)}&navigate=yes`;
  }
  if (app === "apple_maps") {
    return `https://maps.apple.com/?daddr=${encodeURIComponent(q)}&dirflg=d`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
}

export function createNavigationService(preferred: NavApp = "google_maps"): NavigationService {
  return {
    meta: {
      id: "navigation",
      label: "Navegação",
      health: "ready",
      external: "Google Maps / Waze / Apple Maps",
    },
    preferredApp: preferred,
    open(dest, app) {
      const use = app ?? preferred;
      const deepLink = buildLink(use, dest);
      const appLabel =
        use === "waze" ? "Waze" : use === "apple_maps" ? "Apple Maps" : "Google Maps";
      return {
        deepLink,
        reply: `A abrir ${appLabel} para ${dest.label}. Boa viagem 😊`,
      };
    },
  };
}

export const navigationService = createNavigationService();
