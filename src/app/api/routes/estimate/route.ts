import { NextResponse } from "next/server";
import { estimateRoute } from "@/lib/maps/route";
import { isGoogleMapsConfigured, getGoogleMapsApiKeySource } from "@/lib/maps/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pickup = searchParams.get("pickup") || "";
  const dropoff = searchParams.get("dropoff") || "";

  if (pickup.length < 3 || dropoff.length < 3) {
    return NextResponse.json({ error: "Addresses required" }, { status: 400 });
  }

  try {
    const estimate = await estimateRoute(pickup, dropoff);

    if (!estimate) {
      return NextResponse.json(
        {
          error: "Could not estimate route",
          googleMapsConfigured: isGoogleMapsConfigured(),
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      distanceMeters: estimate.distanceMeters,
      durationSeconds: estimate.durationSeconds,
      distanceLabel: `${(estimate.distanceMeters / 1000).toFixed(1)} km`,
      durationLabel:
        estimate.durationSeconds < 3600
          ? `${Math.round(estimate.durationSeconds / 60)} min`
          : `${Math.floor(estimate.durationSeconds / 3600)} h ${Math.round((estimate.durationSeconds % 3600) / 60)} min`,
      googleMapsConfigured: isGoogleMapsConfigured(),
      googleMapsKeySource: getGoogleMapsApiKeySource(),
    });
  } catch (error) {
    console.error("[routes/estimate]", error);
    return NextResponse.json(
      {
        error: "Could not estimate route",
        googleMapsConfigured: isGoogleMapsConfigured(),
      },
      { status: 500 },
    );
  }
}
