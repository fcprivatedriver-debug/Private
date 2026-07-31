import { NextResponse } from "next/server";
import { z } from "zod";
import { getGoogleMapsApiKey } from "@/lib/maps/config";
import {
  googlePlaceDetails,
  geocodeAddressGoogle,
  geocodeAddressNominatim,
} from "@/lib/maps/google-rest";
import { getCuratedPoiById } from "@/lib/maps/lisbon-pois";

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

    if (parsed.data.placeId?.startsWith("zelu:")) {
      const curated = getCuratedPoiById(parsed.data.placeId);
      if (!curated?.lat || !curated?.lng) {
        return NextResponse.json({ error: "Place not found" }, { status: 404 });
      }
      return NextResponse.json({
        formattedAddress: curated.description,
        lat: curated.lat,
        lng: curated.lng,
        placeId: curated.placeId,
        configured: Boolean(key),
        provider: "curated",
      });
    }

    if (parsed.data.placeId && key && !parsed.data.placeId.startsWith("osm:")) {
      const details = await googlePlaceDetails(
        parsed.data.placeId,
        key,
        parsed.data.sessionToken,
      );
      if (details) {
        return NextResponse.json({ ...details, configured: true, provider: "google" });
      }
    }

    const address =
      parsed.data.address ||
      (parsed.data.placeId?.startsWith("osm:") ? undefined : parsed.data.placeId);

    if (address) {
      if (key) {
        const geo = await geocodeAddressGoogle(address, key);
        if (geo) {
          return NextResponse.json({
            formattedAddress: geo.formattedAddress,
            lat: geo.lat,
            lng: geo.lng,
            placeId: geo.placeId ?? null,
            configured: true,
            provider: "google",
          });
        }
      }
      const nominatim = await geocodeAddressNominatim(address);
      if (nominatim) {
        return NextResponse.json({
          formattedAddress: nominatim.formattedAddress,
          lat: nominatim.lat,
          lng: nominatim.lng,
          placeId: null,
          configured: Boolean(key),
          provider: "nominatim",
        });
      }
    }

    return NextResponse.json({ error: "Place not found" }, { status: 404 });
  } catch (error) {
    console.error("[places/details]", error);
    return NextResponse.json({ error: "Failed to resolve place" }, { status: 500 });
  }
}
