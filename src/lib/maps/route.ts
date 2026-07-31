/** Route estimation — Google Directions when keyed, else OSRM / Haversine. */

import { getGoogleMapsApiKey } from "./config";
import {
  geocodeAddressGoogle,
  geocodeAddressNominatim,
  googleDirections,
} from "./google-rest";

export type Coords = { lat: number; lng: number };

export type RouteEstimate = {
  distanceMeters: number;
  durationSeconds: number;
  pickup: Coords;
  dropoff: Coords;
  pickupLabel: string;
  dropoffLabel: string;
  provider?: "google" | "osrm" | "haversine";
};

function haversineMeters(a: Coords, b: Coords): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function geocodeAny(
  query: string,
): Promise<(Coords & { label: string }) | null> {
  const key = getGoogleMapsApiKey();
  if (key) {
    try {
      const google = await geocodeAddressGoogle(query, key);
      if (google) {
        return {
          lat: google.lat,
          lng: google.lng,
          label: google.formattedAddress,
        };
      }
    } catch (error) {
      console.error("[maps/route] Google geocode failed", error);
    }
  }
  const nominatim = await geocodeAddressNominatim(query);
  if (!nominatim) return null;
  return {
    lat: nominatim.lat,
    lng: nominatim.lng,
    label: nominatim.formattedAddress,
  };
}

async function routeOsrm(
  pickup: Coords,
  dropoff: Coords,
): Promise<{ distanceMeters: number; durationSeconds: number } | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=false`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      routes?: { distance: number; duration: number }[];
    };
    const route = data.routes?.[0];
    if (!route) return null;
    return {
      distanceMeters: Math.round(route.distance),
      durationSeconds: Math.round(route.duration),
    };
  } catch {
    return null;
  }
}

/** Estimate driving distance/duration between two addresses or coordinate pairs. */
export async function estimateRoute(input: {
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
}): Promise<RouteEstimate | null> {
  const key = getGoogleMapsApiKey();

  if (key) {
    try {
      const origin =
        input.pickupLat != null && input.pickupLng != null
          ? `${input.pickupLat},${input.pickupLng}`
          : input.pickupAddress;
      const destination =
        input.dropoffLat != null && input.dropoffLng != null
          ? `${input.dropoffLat},${input.dropoffLng}`
          : input.dropoffAddress;

      const google = await googleDirections(origin, destination, key);
      if (google) {
        return {
          distanceMeters: google.distanceMeters,
          durationSeconds: google.durationSeconds,
          pickup: { lat: google.pickupLat, lng: google.pickupLng },
          dropoff: { lat: google.dropoffLat, lng: google.dropoffLng },
          pickupLabel: google.pickupLabel,
          dropoffLabel: google.dropoffLabel,
          provider: "google",
        };
      }
    } catch (error) {
      console.error("[maps/route] Google Directions failed", error);
    }
  }

  const pickup: (Coords & { label: string }) | null =
    input.pickupLat != null && input.pickupLng != null
      ? { lat: input.pickupLat, lng: input.pickupLng, label: input.pickupAddress }
      : await geocodeAny(input.pickupAddress);

  const dropoff: (Coords & { label: string }) | null =
    input.dropoffLat != null && input.dropoffLng != null
      ? {
          lat: input.dropoffLat,
          lng: input.dropoffLng,
          label: input.dropoffAddress,
        }
      : await geocodeAny(input.dropoffAddress);

  if (!pickup || !dropoff) return null;

  const osrm = await routeOsrm(pickup, dropoff);
  if (osrm) {
    return {
      ...osrm,
      pickup: { lat: pickup.lat, lng: pickup.lng },
      dropoff: { lat: dropoff.lat, lng: dropoff.lng },
      pickupLabel: pickup.label,
      dropoffLabel: dropoff.label,
      provider: "osrm",
    };
  }

  const straight = haversineMeters(pickup, dropoff);
  // Road factor ~1.3, average urban speed ~35 km/h
  const distanceMeters = Math.round(straight * 1.3);
  const durationSeconds = Math.round((distanceMeters / 1000 / 35) * 3600);

  return {
    distanceMeters,
    durationSeconds,
    pickup: { lat: pickup.lat, lng: pickup.lng },
    dropoff: { lat: dropoff.lat, lng: dropoff.lng },
    pickupLabel: pickup.label,
    dropoffLabel: dropoff.label,
    provider: "haversine",
  };
}

export function formatDistance(meters: number | null | undefined): string {
  if (meters == null) return "—";
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
