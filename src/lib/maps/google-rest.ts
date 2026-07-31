/**
 * Google Maps REST helpers (server-side).
 * Prefer these over the JS API loader so a server-only key
 * (GOOGLE_MAPS_API_KEY) works without NEXT_PUBLIC_ rebuild.
 */

import { getGoogleMapsApiKey } from "./config";

export type PlaceSuggestion = {
  placeId: string;
  description: string;
  lat?: number;
  lng?: number;
};

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

/** Places Autocomplete via Google REST (server-side). */
export async function googlePlaceAutocomplete(
  input: string,
  apiKey?: string,
  sessionToken?: string,
): Promise<PlaceSuggestion[]> {
  const key = apiKey ?? getGoogleMapsApiKey();
  if (!key || !input.trim()) return [];

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", input.trim());
  url.searchParams.set("key", key);
  url.searchParams.set("language", "pt");
  url.searchParams.set("components", "country:pt");
  url.searchParams.set("types", "geocode");
  if (sessionToken) url.searchParams.set("sessiontoken", sessionToken);

  const data = await googleGet<GoogleAutocompleteResponse>(url);
  if (!data) return [];
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error("[maps] Places autocomplete", data.status, data.error_message);
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

/** Nominatim search — works without Google key (PT bias). */
export async function nominatimSuggest(input: string): Promise<PlaceSuggestion[]> {
  if (!input.trim() || input.trim().length < 3) return [];
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", input.trim());
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "0");
    url.searchParams.set("limit", "5");
    url.searchParams.set("countrycodes", "pt");
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
    }[];
    return data.map((hit) => ({
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
