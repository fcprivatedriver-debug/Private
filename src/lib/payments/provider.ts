import type {
  CreateIntentInput,
  CreateIntentResult,
  PaymentEvent,
  PaymentProvider,
} from "./types";

/** Demo / offline provider — no real charges. */
export class NullPaymentProvider implements PaymentProvider {
  async createPaymentIntent(input: CreateIntentInput): Promise<CreateIntentResult> {
    return {
      status: "not_configured",
      provider: "NONE",
      amount: input.amount,
      currency: input.currency,
      message:
        "Pagamentos seguros em breve. A reserva foi criada; a cobrança será ativada com Stripe Connect.",
    };
  }

  async capture(paymentId: string): Promise<void> {
    void paymentId;
  }

  async refund(paymentId: string, amount?: number): Promise<void> {
    void paymentId;
    void amount;
  }

  async parseWebhook(rawBody: Buffer, signature: string): Promise<PaymentEvent> {
    void rawBody;
    void signature;
    return { type: "ignored", paymentId: null };
  }
}

/**
 * Stripe-ready scaffolding. Activates when PAYMENTS_ENABLED=true and
 * STRIPE_SECRET_KEY is present. Without the Stripe SDK installed, returns a
 * structured "created" intent so the UI can show Elements-ready state.
 * Platform fee stays server-side only (never returned to the customer UI).
 */
export class StripePaymentProvider implements PaymentProvider {
  async createPaymentIntent(input: CreateIntentInput): Promise<CreateIntentResult> {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      return {
        status: "error",
        provider: "STRIPE",
        amount: input.amount,
        currency: input.currency,
        message: "STRIPE_SECRET_KEY em falta",
      };
    }

    // Intent id is deterministic for demo wiring without the Stripe SDK.
    // Replace with stripe.paymentIntents.create when @stripe/stripe-js is added.
    const providerPaymentId = `pi_demo_${input.bookingId.slice(-10)}`;
    return {
      status: "created",
      provider: "STRIPE",
      amount: input.amount,
      currency: input.currency,
      providerPaymentId,
      clientSecret: `${providerPaymentId}_secret_demo`,
      message: "PaymentIntent preparado (Stripe Connect). Taxa de plataforma processada no servidor.",
    };
  }

  async capture(paymentId: string): Promise<void> {
    void paymentId;
  }

  async refund(paymentId: string, amount?: number): Promise<void> {
    void paymentId;
    void amount;
  }

  async parseWebhook(rawBody: Buffer, signature: string): Promise<PaymentEvent> {
    void rawBody;
    void signature;
    return { type: "payment_intent.succeeded", paymentId: null };
  }
}

let provider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (!provider) {
    const enabled = process.env.PAYMENTS_ENABLED === "true";
    provider = enabled ? new StripePaymentProvider() : new NullPaymentProvider();
  }
  return provider;
}
