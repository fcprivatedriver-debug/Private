import { getGoogleMapsApiKey } from "./config";
import type { PlaceSuggestion } from "./place-types";

export type { PlaceSuggestion } from "./place-types";


type GoogleAutocompleteResponse = {
  status: string;
  error_message?: string;
  predictions?: { place_id: string; description: string }[];
};

type GooglePlaceDetailsResponse = {
  status: string;
  error_message?: string;
  result?: {
    formatted_address: string;
    geometry?: { location: { lat: number; lng: number } };
    place_id?: string;
  };
};

type GoogleGeocodeResponse = {
  status: string;
  error_message?: string;
  results?: {
    formatted_address: string;
    geometry: { location: { lat: number; lng: number } };
    place_id?: string;
  }[];
};

type GoogleDirectionsResponse = {
  status: string;
  error_message?: string;
  routes?: {
    legs?: {
      distance?: { value: number };
      duration?: { value: number };
      start_location?: { lat: number; lng: number };
      end_location?: { lat: number; lng: number };
      start_address?: string;
      end_address?: string;
    }[];
  }[];
};

async function googleGet<T>(url: URL): Promise<T | null> {
  try {
    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!res.ok) {
      console.error("[maps] Google HTTP", res.status, url.pathname);
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.error("[maps] Google fetch failed", error);
    return null;
  }
}

/** Places Autocomplete via Google REST (server-side).
 * Do NOT restrict to `types=geocode` — that hides airports, stations, hotels and POIs.
 */
export async function googlePlaceAutocomplete(
  input: string,
  apiKey?: string,
  sessionToken?: string,
): Promise<PlaceSuggestion[]> {
  const key = apiKey ?? getGoogleMapsApiKey();
  if (!key || !input.trim()) return [];

  const q = input.trim();

  // Unrestricted (addresses + establishments) and establishment-biased, Lisbon-centered.
  const [mixed, establishments] = await Promise.all([
    googleAutocompleteRequest(q, key, sessionToken, undefined),
    googleAutocompleteRequest(q, key, sessionToken, "establishment"),
  ]);

  const seen = new Set<string>();
  const out: PlaceSuggestion[] = [];
  for (const item of [...establishments, ...mixed]) {
    if (seen.has(item.placeId)) continue;
    seen.add(item.placeId);
    out.push(item);
  }
  return out;
}

async function googleAutocompleteRequest(
  input: string,
  key: string,
  sessionToken: string | undefined,
  types: string | undefined,
): Promise<PlaceSuggestion[]> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", input);
  url.searchParams.set("key", key);
  url.searchParams.set("language", "pt");
  url.searchParams.set("components", "country:pt");
  // Bias to Greater Lisbon so “aeroporto” / “oriente” resolve locally
  url.searchParams.set("location", "38.7223,-9.1393");
  url.searchParams.set("radius", "70000");
  if (types) url.searchParams.set("types", types);
  if (sessionToken) url.searchParams.set("sessiontoken", sessionToken);

  const data = await googleGet<GoogleAutocompleteResponse>(url);
  if (!data) return [];
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error("[maps] Places autocomplete", data.status, data.error_message, types ?? "mixed");
    return [];
  }
  return (data.predictions ?? []).map((p) => ({
    placeId: p.place_id,
    description: p.description,
  }));
}

/** Place Details — resolve placeId to lat/lng + formatted address. */
export async function googlePlaceDetails(
  placeId: string,
  apiKey?: string,
  sessionToken?: string,
): Promise<{
  formattedAddress: string;
  lat: number;
  lng: number;
  placeId: string;
} | null> {
  if (placeId.startsWith("zelu:")) {
    const { getCuratedPoiById } = await import("./lisbon-pois");
    const curated = getCuratedPoiById(placeId);
    if (!curated?.lat || !curated?.lng) return null;
    return {
      formattedAddress: curated.description,
      lat: curated.lat,
      lng: curated.lng,
      placeId: curated.placeId,
    };
  }

  const key = apiKey ?? getGoogleMapsApiKey();
  if (!key || !placeId.trim() || placeId.startsWith("osm:")) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId.trim());
  url.searchParams.set("key", key);
  url.searchParams.set("language", "pt");
  url.searchParams.set("fields", "formatted_address,geometry,place_id");
  if (sessionToken) url.searchParams.set("sessiontoken", sessionToken);

  const data = await googleGet<GooglePlaceDetailsResponse>(url);
  if (!data || data.status !== "OK" || !data.result?.geometry) {
    if (data?.status && data.status !== "OK") {
      console.error("[maps] Place details", data.status, data.error_message);
    }
    return null;
  }
  return {
    formattedAddress: data.result.formatted_address,
    lat: data.result.geometry.location.lat,
    lng: data.result.geometry.location.lng,
    placeId: data.result.place_id ?? placeId,
  };
}

/** Nominatim search — works without Google key (PT + Lisbon bias). */
export async function nominatimSuggest(input: string): Promise<PlaceSuggestion[]> {
  if (!input.trim() || input.trim().length < 2) return [];
  try {
    const q = input.trim();
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "0");
    url.searchParams.set("limit", "8");
    url.searchParams.set("countrycodes", "pt");
    // Prefer Greater Lisbon results for short / local queries
    url.searchParams.set("viewbox", "-9.55,38.55,-8.95,39.05");
    url.searchParams.set("bounded", "0");
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "ZELU/1.0 (private chauffeur marketplace; contact=support@zelu.app)",
        Accept: "application/json",
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      place_id: number;
      display_name: string;
      lat: string;
      lon: string;
      class?: string;
      type?: string;
      importance?: number;
    }[];

    // Prefer aerodromes, stations, amenities, tourism over generic roads
    const rank = (hit: (typeof data)[number]) => {
      const c = `${hit.class || ""}:${hit.type || ""}`;
      if (c.includes("aerodrome") || c.includes("airport")) return 100;
      if (c.includes("station") || c.includes("railway")) return 90;
      if (c.includes("hotel") || c.includes("tourism")) return 80;
      if (c.includes("amenity") || c.includes("building")) return 70;
      return 40 + (hit.importance ?? 0) * 10;
    };

    return [...data]
      .sort((a, b) => rank(b) - rank(a))
      .map((hit) => ({
        placeId: `osm:${hit.place_id}`,
        description: hit.display_name,
        lat: Number(hit.lat),
        lng: Number(hit.lon),
      }));
  } catch (error) {
    console.error("[maps] Nominatim suggest failed", error);
    return [];
  }
}

export async function geocodeAddressGoogle(
  address: string,
  apiKey?: string,
): Promise<{
  lat: number;
  lng: number;
  formattedAddress: string;
  placeId?: string;
} | null> {
  const key = apiKey ?? getGoogleMapsApiKey();
  if (!key || !address.trim()) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address.trim());
  url.searchParams.set("key", key);
  url.searchParams.set("language", "pt");
  url.searchParams.set("region", "pt");

  const data = await googleGet<GoogleGeocodeResponse>(url);
  if (!data || (data.status !== "OK" && data.status !== "ZERO_RESULTS")) {
    if (data?.status) console.error("[maps] Geocode", data.status, data.error_message);
    return null;
  }
  const result = data.results?.[0];
  if (!result) return null;
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formattedAddress: result.formatted_address,
    placeId: result.place_id,
  };
}

export async function geocodeAddressNominatim(address: string): Promise<{
  lat: number;
  lng: number;
  formattedAddress: string;
} | null> {
  if (!address.trim()) return null;
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", address.trim());
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "pt");
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "ZELU/1.0 (private chauffeur marketplace; contact=support@zelu.app)",
        Accept: "application/json",
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      lat: string;
      lon: string;
      display_name: string;
    }[];
    const hit = data[0];
    if (!hit) return null;
    return {
      lat: Number(hit.lat),
      lng: Number(hit.lon),
      formattedAddress: hit.display_name,
    };
  } catch {
    return null;
  }
}

/** Directions by free-text addresses (or lat,lng strings). */
export async function googleDirections(
  origin: string,
  destination: string,
  apiKey?: string,
): Promise<{
  distanceMeters: number;
  durationSeconds: number;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  pickupLabel: string;
  dropoffLabel: string;
} | null> {
  const key = apiKey ?? getGoogleMapsApiKey();
  if (!key) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
  url.searchParams.set("origin", origin);
  url.searchParams.set("destination", destination);
  url.searchParams.set("mode", "driving");
  url.searchParams.set("key", key);
  url.searchParams.set("language", "pt");
  url.searchParams.set("region", "pt");

  const data = await googleGet<GoogleDirectionsResponse>(url);
  if (!data || data.status !== "OK") {
    if (data?.status) console.error("[maps] Directions", data.status, data.error_message);
    return null;
  }
  const leg = data.routes?.[0]?.legs?.[0];
  if (
    !leg?.distance?.value ||
    !leg?.duration?.value ||
    !leg.start_location ||
    !leg.end_location
  ) {
    return null;
  }
  return {
    distanceMeters: Math.round(leg.distance.value),
    durationSeconds: Math.round(leg.duration.value),
    pickupLat: leg.start_location.lat,
    pickupLng: leg.start_location.lng,
    dropoffLat: leg.end_location.lat,
    dropoffLng: leg.end_location.lng,
    pickupLabel: leg.start_address ?? origin,
    dropoffLabel: leg.end_address ?? destination,
  };
}
