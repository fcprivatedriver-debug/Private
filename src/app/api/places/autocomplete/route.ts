import { NextResponse } from "next/server";
import { autocompletePlaces } from "@/lib/maps/places-server";
import { isGoogleMapsConfigured } from "@/lib/maps/google";

export async function GET(req: Request) {
  if (!isGoogleMapsConfigured() && !process.env.GOOGLE_MAPS_SERVER_KEY) {
    return NextResponse.json({ configured: false, suggestions: [] }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const input = searchParams.get("input") || "";
  const locale = searchParams.get("locale") || "pt";

  if (input.trim().length < 2) {
    return NextResponse.json({ configured: true, suggestions: [] });
  }

  const suggestions = await autocompletePlaces(input, locale);
  return NextResponse.json({ configured: true, suggestions });
}
