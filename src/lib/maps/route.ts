/** Route estimation — Google Directions when configured, OSRM / Haversine fallback. */

export type Coords = { lat: number; lng: number };

export type RouteEstimate = {
  distanceMeters: number;
  durationSeconds: number;
  pickup: Coords;
  dropoff: Coords;
  pickupLabel: string;
  dropoffLabel: string;
  provider: "google" | "osrm" | "haversine";
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

function mapsApiKey(): string | undefined {
  return (
    process.env.GOOGLE_MAPS_SERVER_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    undefined
  );
}

async function geocodeNominatim(query: string): Promise<(Coords & { label: string }) | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "ZRIK/1.0 (marketplace)" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];
    const hit = data[0];
    if (!hit) return null;
    return {
      lat: Number(hit.lat),
      lng: Number(hit.lon),
      label: hit.display_name,
    };
  } catch {
    return null;
  }
}

async function geocodeGoogle(query: string): Promise<(Coords & { label: string }) | null> {
  const key = mapsApiKey();
  if (!key) return null;
  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", query);
    url.searchParams.set("key", key);
    const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status: string;
      results?: {
        formatted_address: string;
        geometry: { location: { lat: number; lng: number } };
      }[];
    };
    const hit = data.results?.[0];
    if (!hit || data.status !== "OK") return null;
    return {
      lat: hit.geometry.location.lat,
      lng: hit.geometry.location.lng,
      label: hit.formatted_address,
    };
  } catch {
    return null;
  }
}

async function routeGoogleDirections(
  origin: string | Coords,
  destination: string | Coords,
): Promise<{
  distanceMeters: number;
  durationSeconds: number;
  pickup: Coords & { label: string };
  dropoff: Coords & { label: string };
} | null> {
  const key = mapsApiKey();
  if (!key) return null;

  const originParam =
    typeof origin === "string" ? origin : `${origin.lat},${origin.lng}`;
  const destParam =
    typeof destination === "string"
      ? destination
      : `${destination.lat},${destination.lng}`;

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
    url.searchParams.set("origin", originParam);
    url.searchParams.set("destination", destParam);
    url.searchParams.set("mode", "driving");
    url.searchParams.set("key", key);
    const res = await fetch(url.toString(), { next: { revalidate: 1800 } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status: string;
      routes?: {
        legs?: {
          distance?: { value: number };
          duration?: { value: number };
          start_address?: string;
          end_address?: string;
          start_location?: { lat: number; lng: number };
          end_location?: { lat: number; lng: number };
        }[];
      }[];
    };
    if (data.status !== "OK") {
      console.warn("[maps] Directions status", data.status);
      return null;
    }
    const leg = data.routes?.[0]?.legs?.[0];
    if (!leg?.distance?.value || !leg.duration?.value || !leg.start_location || !leg.end_location) {
      return null;
    }
    return {
      distanceMeters: Math.round(leg.distance.value),
      durationSeconds: Math.round(leg.duration.value),
      pickup: {
        lat: leg.start_location.lat,
        lng: leg.start_location.lng,
        label: leg.start_address || originParam,
      },
      dropoff: {
        lat: leg.end_location.lat,
        lng: leg.end_location.lng,
        label: leg.end_address || destParam,
      },
    };
  } catch (err) {
    console.error("[maps] Directions failed", err);
    return null;
  }
}

async function routeOsrm(pickup: Coords, dropoff: Coords): Promise<{
  distanceMeters: number;
  durationSeconds: number;
} | null> {
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

async function resolvePoint(
  address: string,
  lat?: number | null,
  lng?: number | null,
): Promise<(Coords & { label: string }) | null> {
  if (lat != null && lng != null) {
    return { lat, lng, label: address };
  }
  return (await geocodeGoogle(address)) || (await geocodeNominatim(address));
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
  // Prefer Google Directions (origin/destination as addresses for best place resolution)
  const google = await routeGoogleDirections(input.pickupAddress, input.dropoffAddress);
  if (google) {
    return {
      distanceMeters: google.distanceMeters,
      durationSeconds: google.durationSeconds,
      pickup: { lat: google.pickup.lat, lng: google.pickup.lng },
      dropoff: { lat: google.dropoff.lat, lng: google.dropoff.lng },
      pickupLabel: google.pickup.label,
      dropoffLabel: google.dropoff.label,
      provider: "google",
    };
  }

  const pickup = await resolvePoint(
    input.pickupAddress,
    input.pickupLat,
    input.pickupLng,
  );
  const dropoff = await resolvePoint(
    input.dropoffAddress,
    input.dropoffLat,
    input.dropoffLng,
  );
  if (!pickup || !dropoff) return null;

  // Retry Directions with coordinates if address-based call failed
  const googleCoords = await routeGoogleDirections(pickup, dropoff);
  if (googleCoords) {
    return {
      distanceMeters: googleCoords.distanceMeters,
      durationSeconds: googleCoords.durationSeconds,
      pickup: { lat: googleCoords.pickup.lat, lng: googleCoords.pickup.lng },
      dropoff: { lat: googleCoords.dropoff.lat, lng: googleCoords.dropoff.lng },
      pickupLabel: pickup.label,
      dropoffLabel: dropoff.label,
      provider: "google",
    };
  }

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
