/** Route estimation helpers — OSRM when possible, Haversine fallback. */

export type Coords = { lat: number; lng: number };

export type RouteEstimate = {
  distanceMeters: number;
  durationSeconds: number;
  pickup: Coords;
  dropoff: Coords;
  pickupLabel: string;
  dropoffLabel: string;
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

async function geocodeNominatim(query: string): Promise<(Coords & { label: string }) | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "HegosDemo/1.0 (marketplace)" },
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

/** Estimate driving distance/duration between two addresses or coordinate pairs. */
export async function estimateRoute(input: {
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
}): Promise<RouteEstimate | null> {
  const pickup: (Coords & { label: string }) | null =
    input.pickupLat != null && input.pickupLng != null
      ? { lat: input.pickupLat, lng: input.pickupLng, label: input.pickupAddress }
      : await geocodeNominatim(input.pickupAddress);

  const dropoff: (Coords & { label: string }) | null =
    input.dropoffLat != null && input.dropoffLng != null
      ? { lat: input.dropoffLat, lng: input.dropoffLng, label: input.dropoffAddress }
      : await geocodeNominatim(input.dropoffAddress);

  if (!pickup || !dropoff) return null;

  const osrm = await routeOsrm(pickup, dropoff);
  if (osrm) {
    return {
      ...osrm,
      pickup: { lat: pickup.lat, lng: pickup.lng },
      dropoff: { lat: dropoff.lat, lng: dropoff.lng },
      pickupLabel: pickup.label,
      dropoffLabel: dropoff.label,
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
