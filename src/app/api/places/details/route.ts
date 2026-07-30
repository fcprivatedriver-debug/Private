import { NextResponse } from "next/server";
import { z } from "zod";
import { getGoogleMapsApiKey } from "@/lib/maps/config";
import { googlePlaceDetails, geocodeAddressGoogle } from "@/lib/maps/google-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  placeId: z.string().trim().min(3).max(256).optional(),
  address: z.string().trim().min(3).max(300).optional(),
  sessionToken: z.string().trim().max(64).optional(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = QuerySchema.safeParse({
      placeId: url.searchParams.get("placeId") ?? undefined,
      address: url.searchParams.get("address") ?? undefined,
      sessionToken: url.searchParams.get("sessionToken") ?? undefined,
    });

    if (!parsed.success || (!parsed.data.placeId && !parsed.data.address)) {
      return NextResponse.json({ error: "placeId or address required" }, { status: 400 });
    }

    const key = getGoogleMapsApiKey();
    if (!key) {
      return NextResponse.json(
        { error: "Google Maps key not configured", configured: false },
        { status: 503 },
      );
    }

    if (parsed.data.placeId) {
      const details = await googlePlaceDetails(parsed.data.placeId, key, parsed.data.sessionToken);
      if (!details) {
        return NextResponse.json({ error: "Place not found" }, { status: 404 });
      }
      return NextResponse.json({ ...details, configured: true, provider: "google" });
    }

    const geo = await geocodeAddressGoogle(parsed.data.address!, key);
    if (!geo) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }
    return NextResponse.json({
      formattedAddress: geo.formattedAddress,
      lat: geo.lat,
      lng: geo.lng,
      placeId: null,
      configured: true,
      provider: "google",
    });
  } catch (error) {
    console.error("[places/details]", error);
    return NextResponse.json({ error: "Failed to resolve place" }, { status: 500 });
  }
}
