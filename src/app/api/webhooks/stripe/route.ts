import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { prisma } from "@/lib/db";
import { activateSubscriptionFromPayment } from "@/lib/payments/activate";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = getStripe();

  if (!secret || !stripe) {
    return NextResponse.json({
      received: true,
      ignored: true,
      reason: "Stripe webhook not configured",
    });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const sessionId = session.id;

    let payment = await prisma.payment.findFirst({
      where: { providerSessionId: sessionId },
    });

    if (!payment && session.metadata?.subscriptionId) {
      payment = await prisma.payment.findFirst({
        where: {
          subscriptionId: session.metadata.subscriptionId,
          status: "PENDING",
        },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!payment && session.metadata?.paymentId) {
      payment = await prisma.payment.findUnique({
        where: { id: session.metadata.paymentId },
      });
    }

    if (payment) {
      await activateSubscriptionFromPayment(payment.id);
    }
  }

  return NextResponse.json({ received: true, type: event.type });
}
