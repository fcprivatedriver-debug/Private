import { expireStaleTripsAndOffers } from "@/domain/marketplace";

/**
 * Cron/manual expiry endpoint.
 * Secure with CRON_SECRET in production (Authorization: Bearer <secret>).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await expireStaleTripsAndOffers();
  return Response.json({ ok: true, ...result, at: new Date().toISOString() });
}

export async function POST(request: Request) {
  return GET(request);
}
