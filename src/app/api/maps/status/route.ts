import { NextResponse } from "next/server";
import { isGoogleMapsConfigured, getGoogleMapsApiKey } from "@/lib/maps/google";

/** Client-safe Maps status (does not expose the key). */
export async function GET() {
  const configured = Boolean(
    isGoogleMapsConfigured() || process.env.GOOGLE_MAPS_SERVER_KEY,
  );
  return NextResponse.json({
    configured,
    /** Public key for Maps JavaScript API (Directions map). Already NEXT_PUBLIC. */
    browserKey: configured ? getGoogleMapsApiKey() || null : null,
  });
}
