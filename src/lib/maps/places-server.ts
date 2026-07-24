import { getGoogleMapsApiKey, isGoogleMapsConfigured } from "@/lib/maps/google";

export type PlaceSuggestion = {
  placeId: string;
  description: string;
  mainText?: string;
  secondaryText?: string;
};

export type PlaceDetails = {
  placeId: string;
  formattedAddress: string;
  lat: number;
  lng: number;
};

function mapsKey(): string | null {
  return (
    process.env.GOOGLE_MAPS_SERVER_KEY ||
    getGoogleMapsApiKey() ||
    null
  );
}

/** Server-side Google Places Autocomplete (REST). */
export async function autocompletePlaces(
  input: string,
  locale = "pt",
): Promise<PlaceSuggestion[]> {
  const key = mapsKey();
  if (!key || input.trim().length < 2) return [];

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", input.trim());
  url.searchParams.set("key", key);
  url.searchParams.set("language", locale.startsWith("pt") ? "pt-PT" : "en");

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) {
    console.error("[places] autocomplete HTTP", res.status);
    return [];
  }
  const data = (await res.json()) as {
    status: string;
    error_message?: string;
    predictions?: {
      place_id: string;
      description: string;
      structured_formatting?: { main_text?: string; secondary_text?: string };
    }[];
  };

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error("[places] autocomplete", data.status, data.error_message);
    return [];
  }

  return (data.predictions || []).map((p) => ({
    placeId: p.place_id,
    description: p.description,
    mainText: p.structured_formatting?.main_text,
    secondaryText: p.structured_formatting?.secondary_text,
  }));
}

/** Server-side Place Details for lat/lng. */
export async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const key = mapsKey();
  if (!key || !placeId) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "place_id,formatted_address,geometry");
  url.searchParams.set("key", key);

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    status: string;
    result?: {
      place_id: string;
      formatted_address: string;
      geometry?: { location?: { lat: number; lng: number } };
    };
  };
  if (data.status !== "OK" || !data.result?.geometry?.location) {
    console.error("[places] details", data.status);
    return null;
  }
  return {
    placeId: data.result.place_id,
    formattedAddress: data.result.formatted_address,
    lat: data.result.geometry.location.lat,
    lng: data.result.geometry.location.lng,
  };
}

export { isGoogleMapsConfigured };
