import { NextResponse } from "next/server";
import { z } from "zod";
import { getGoogleMapsApiKey } from "@/lib/maps/config";
import { googlePlaceAutocomplete, nominatimSuggest } from "@/lib/maps/google-rest";
import {
  matchCuratedPois,
  mergePlaceSuggestions,
} from "@/lib/maps/lisbon-pois";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  q: z.string().trim().min(2).max(200),
  sessionToken: z.string().trim().max(64).optional(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = QuerySchema.safeParse({
      q: url.searchParams.get("q") ?? "",
      sessionToken: url.searchParams.get("sessionToken") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ suggestions: [], provider: "none" });
    }

    const { q, sessionToken } = parsed.data;
    const key = getGoogleMapsApiKey();
    const curated = matchCuratedPois(q, 5);

    let google: Awaited<ReturnType<typeof googlePlaceAutocomplete>> = [];
    if (key) {
      try {
        google = await googlePlaceAutocomplete(q, key, sessionToken);
      } catch (error) {
        console.error("[places/autocomplete] Google failed", error);
      }
    }

    // Always merge Nominatim so POIs (airport, stations) are not lost when
    // Google returns only a street geocode (e.g. “Estrada do Aeroporto”).
    let nominatim: Awaited<ReturnType<typeof nominatimSuggest>> = [];
    try {
      nominatim = await nominatimSuggest(q);
    } catch (error) {
      console.error("[places/autocomplete] Nominatim failed", error);
    }

    const suggestions = mergePlaceSuggestions(curated, google, nominatim).slice(0, 8);
    const provider =
      curated.length > 0 && google.length > 0
        ? "curated+google"
        : curated.length > 0
          ? "curated"
          : google.length > 0
            ? "google"
            : nominatim.length > 0
              ? key
                ? "nominatim-fallback"
                : "nominatim"
              : "none";

    return NextResponse.json({
      suggestions,
      provider,
      configured: Boolean(key),
    });
  } catch (error) {
    console.error("[places/autocomplete]", error);
    return NextResponse.json(
      { suggestions: [], provider: "error", configured: Boolean(getGoogleMapsApiKey()) },
      { status: 500 },
    );
  }
}
