import Stripe from "stripe";
import { paymentsEnabled, stripeConfigured } from "@/config/env";

let stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!stripeConfigured() || !process.env.STRIPE_SECRET_KEY) return null;
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-07-30.basil" as Stripe.LatestApiVersion,
    });
  }
  return stripe;
}

export function canCharge(): boolean {
  return paymentsEnabled() && stripeConfigured();
}

export type CheckoutResult =
  | {
      mode: "stripe";
      sessionId: string;
      url: string;
    }
  | {
      mode: "demo";
      paymentId: string;
      mbEntity?: string;
      mbReference?: string;
      expiresAt?: string;
    };

/** Portuguese-friendly payment methods via Stripe (card, MB WAY, Multibanco when enabled). */
export const STRIPE_PAYMENT_METHOD_TYPES: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = [
  "card",
];
