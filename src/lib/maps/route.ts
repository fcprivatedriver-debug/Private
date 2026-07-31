export type RouteEstimate = {
  distanceMeters: number;
  durationSeconds: number;
};

/** Estimate route distance/duration. Uses Google Distance Matrix when key present; else heuristic. */
export async function estimateRoute(
  origin: string,
  destination: string,
): Promise<RouteEstimate | null> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (key) {
    try {
      const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
      url.searchParams.set("origins", origin);
      url.searchParams.set("destinations", destination);
      url.searchParams.set("mode", "driving");
      url.searchParams.set("language", "pt-PT");
      url.searchParams.set("key", key);
      const res = await fetch(url.toString());
      const data = await res.json();
      const el = data?.rows?.[0]?.elements?.[0];
      if (el?.status === "OK") {
        return {
          distanceMeters: el.distance.value,
          durationSeconds: el.duration.value,
        };
      }
    } catch (err) {
      console.error("[maps] distance matrix failed", err);
    }
  }

  // Demo heuristic: ~35 km/h average urban, base 20 min
  const hash = [...(origin + destination)].reduce((a, c) => a + c.charCodeAt(0), 0);
  const minutes = 20 + (hash % 40);
  return {
    distanceMeters: Math.round(minutes * 500),
    durationSeconds: minutes * 60,
  };
}
