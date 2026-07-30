import { NextResponse } from "next/server";
import { z } from "zod";
import { getGoogleMapsApiKey } from "@/lib/maps/config";
import { googlePlaceAutocomplete, nominatimSuggest } from "@/lib/maps/google-rest";

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

    if (key) {
      try {
        const suggestions = await googlePlaceAutocomplete(q, key, sessionToken);
        if (suggestions.length > 0) {
          return NextResponse.json({
            suggestions,
            provider: "google",
            configured: true,
          });
        }
      } catch (error) {
        console.error("[places/autocomplete] Google failed", error);
      }
    }

    const suggestions = await nominatimSuggest(q);
    return NextResponse.json({
      suggestions,
      provider: key ? "nominatim-fallback" : "nominatim",
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
