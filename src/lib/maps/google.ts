import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

let configured = false;

export function getGoogleMapsApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || undefined;
}

export function isGoogleMapsConfigured(): boolean {
  return Boolean(getGoogleMapsApiKey());
}

function ensureConfigured() {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured");
  }
  if (!configured) {
    setOptions({
      key: apiKey,
      v: "weekly",
    });
    configured = true;
  }
}

/** Geocode a free-text address to coordinates. */
export async function geocodeAddress(address: string): Promise<{
  lat: number;
  lng: number;
  formattedAddress: string;
} | null> {
  if (!isGoogleMapsConfigured()) return null;

  ensureConfigured();
  const { Geocoder } = await importLibrary("geocoding");
  const geocoder = new Geocoder();
  const response = await geocoder.geocode({ address });
  const result = response.results[0];
  if (!result) return null;
  return {
    lat: result.geometry.location.lat(),
    lng: result.geometry.location.lng(),
    formattedAddress: result.formatted_address,
  };
}

/** Reverse geocode coordinates to an address. */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!isGoogleMapsConfigured()) return null;
  ensureConfigured();
  const { Geocoder } = await importLibrary("geocoding");
  const geocoder = new Geocoder();
  const response = await geocoder.geocode({ location: { lat, lng } });
  return response.results[0]?.formatted_address ?? null;
}

export type PlaceSuggestion = {
  placeId: string;
  description: string;
};

/**
 * Places Autocomplete suggestions.
 * Returns [] when Maps is not configured (Phase 0 safe degradation).
 */
export async function suggestPlaces(input: string): Promise<PlaceSuggestion[]> {
  if (!input.trim() || !isGoogleMapsConfigured()) return [];

  try {
    ensureConfigured();
    const { AutocompleteService } = await importLibrary("places");
    const service = new AutocompleteService();
    const predictions = await new Promise<google.maps.places.AutocompletePrediction[]>(
      (resolve) => {
        service.getPlacePredictions({ input, types: ["geocode"] }, (res) => {
          resolve(res ?? []);
        });
      },
    );

    return predictions.map((p) => ({
      placeId: p.place_id,
      description: p.description,
    }));
  } catch (error) {
    console.error("Google Places suggest failed", error);
    return [];
  }
}

export async function loadPlacesLibrary() {
  if (!isGoogleMapsConfigured()) return null;
  ensureConfigured();
  return importLibrary("places");
}
