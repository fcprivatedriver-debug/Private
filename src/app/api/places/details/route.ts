import { NextResponse } from "next/server";
import { fetchPlaceDetails } from "@/lib/maps/places-server";
import { isGoogleMapsConfigured } from "@/lib/maps/google";

export async function GET(req: Request) {
  if (!isGoogleMapsConfigured() && !process.env.GOOGLE_MAPS_SERVER_KEY) {
    return NextResponse.json({ error: "Maps not configured" }, { status: 503 });
  }

  const placeId = new URL(req.url).searchParams.get("placeId") || "";
  if (!placeId) {
    return NextResponse.json({ error: "placeId required" }, { status: 400 });
  }

  const details = await fetchPlaceDetails(placeId);
  if (!details) {
    return NextResponse.json({ error: "Place not found" }, { status: 404 });
  }

  return NextResponse.json(details);
}
