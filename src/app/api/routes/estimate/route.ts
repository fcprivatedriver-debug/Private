import { NextResponse } from "next/server";
import { estimateRoute } from "@/lib/maps/route";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pickup = searchParams.get("pickup") || "";
  const dropoff = searchParams.get("dropoff") || "";
  const pickupLat = searchParams.get("pickupLat");
  const pickupLng = searchParams.get("pickupLng");
  const dropoffLat = searchParams.get("dropoffLat");
  const dropoffLng = searchParams.get("dropoffLng");

  if (pickup.length < 3 || dropoff.length < 3) {
    return NextResponse.json({ error: "Addresses required" }, { status: 400 });
  }

  const estimate = await estimateRoute({
    pickupAddress: pickup,
    dropoffAddress: dropoff,
    pickupLat: pickupLat ? Number(pickupLat) : null,
    pickupLng: pickupLng ? Number(pickupLng) : null,
    dropoffLat: dropoffLat ? Number(dropoffLat) : null,
    dropoffLng: dropoffLng ? Number(dropoffLng) : null,
  });

  if (!estimate) {
    return NextResponse.json({ error: "Could not estimate route" }, { status: 422 });
  }

  return NextResponse.json({
    distanceMeters: estimate.distanceMeters,
    durationSeconds: estimate.durationSeconds,
    pickupLat: estimate.pickup.lat,
    pickupLng: estimate.pickup.lng,
    dropoffLat: estimate.dropoff.lat,
    dropoffLng: estimate.dropoff.lng,
    distanceLabel: `${(estimate.distanceMeters / 1000).toFixed(1)} km`,
    durationLabel:
      estimate.durationSeconds < 3600
        ? `${Math.round(estimate.durationSeconds / 60)} min`
        : `${Math.floor(estimate.durationSeconds / 3600)} h ${Math.round((estimate.durationSeconds % 3600) / 60)} min`,
  });
}
