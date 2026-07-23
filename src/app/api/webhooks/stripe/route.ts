import { getPaymentProvider } from "@/lib/payments/provider";

/** Stripe webhook stub — ready for future Connect integration. */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature") || "";
  const rawBody = Buffer.from(await request.arrayBuffer());

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({
      received: true,
      ignored: true,
      reason: "STRIPE_WEBHOOK_SECRET not configured",
    });
  }

  const event = await getPaymentProvider().parseWebhook(rawBody, signature);
  return Response.json({ received: true, event });
}
