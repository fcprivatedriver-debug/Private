import type {
  CreateIntentInput,
  CreateIntentResult,
  PaymentEvent,
  PaymentProvider,
} from "./types";

function isRealStripeSecret(secret: string | undefined): boolean {
  if (!secret) return false;
  // Demo / placeholder keys used in local .env — do not call Stripe API
  if (secret.includes("_demo_") || secret === "sk_test_demo") return false;
  return /^sk_(test|live)_/.test(secret) && secret.length > 20;
}

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
 * Stripe provider.
 * - Real `sk_test_` / `sk_live_` keys → Stripe PaymentIntents API
 * - Demo / missing keys with PAYMENTS_ENABLED → local demo intent (test card UI)
 */
export class StripePaymentProvider implements PaymentProvider {
  async createPaymentIntent(input: CreateIntentInput): Promise<CreateIntentResult> {
    const secret = process.env.STRIPE_SECRET_KEY;

    if (isRealStripeSecret(secret)) {
      try {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(secret!);
        const intent = await stripe.paymentIntents.create({
          amount: input.amount,
          currency: input.currency.toLowerCase(),
          automatic_payment_methods: { enabled: true },
          metadata: {
            bookingId: input.bookingId,
            platformFeeAmount: String(input.platformFeeAmount),
          },
          receipt_email: input.customerEmail || undefined,
          application_fee_amount: input.driverConnectAccountId
            ? input.platformFeeAmount
            : undefined,
          transfer_data: input.driverConnectAccountId
            ? { destination: input.driverConnectAccountId }
            : undefined,
        });
        return {
          status: "created",
          provider: "STRIPE",
          amount: input.amount,
          currency: input.currency,
          providerPaymentId: intent.id,
          clientSecret: intent.client_secret ?? undefined,
          message: "PaymentIntent Stripe criado. Finalize o pagamento no checkout.",
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro Stripe";
        console.error("[stripe] createPaymentIntent failed:", message);
        return {
          status: "error",
          provider: "STRIPE",
          amount: input.amount,
          currency: input.currency,
          message,
        };
      }
    }

    // Demo mode: deterministic intent so checkout UI works without Stripe account
    const providerPaymentId = `pi_demo_${input.bookingId.replace(/[^a-zA-Z0-9]/g, "").slice(-12)}`;
    return {
      status: "created",
      provider: "STRIPE",
      amount: input.amount,
      currency: input.currency,
      providerPaymentId,
      clientSecret: `${providerPaymentId}_secret_demo`,
      message:
        "Modo demonstração Stripe — use o cartão de teste 4242… e confirme o pagamento.",
    };
  }

  async capture(paymentId: string): Promise<void> {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!isRealStripeSecret(secret) || paymentId.startsWith("pi_demo_")) return;
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(secret!);
      await stripe.paymentIntents.capture(paymentId);
    } catch (err) {
      console.error("[stripe] capture failed:", err);
    }
  }

  async refund(paymentId: string, amount?: number): Promise<void> {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!isRealStripeSecret(secret) || paymentId.startsWith("pi_demo_")) return;
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(secret!);
      await stripe.refunds.create({
        payment_intent: paymentId,
        amount,
      });
    } catch (err) {
      console.error("[stripe] refund failed:", err);
    }
  }

  async parseWebhook(rawBody: Buffer, signature: string): Promise<PaymentEvent> {
    const secret = process.env.STRIPE_SECRET_KEY;
    const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!isRealStripeSecret(secret) || !whSecret || whSecret.includes("_demo_")) {
      return { type: "payment_intent.succeeded", paymentId: null };
    }
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(secret!);
      const event = stripe.webhooks.constructEvent(rawBody, signature, whSecret);
      if (
        event.type === "payment_intent.succeeded" ||
        event.type === "payment_intent.payment_failed"
      ) {
        const pi = event.data.object as { id?: string };
        return { type: event.type, paymentId: pi.id ?? null };
      }
      return { type: event.type, paymentId: null };
    } catch (err) {
      console.error("[stripe] webhook parse failed:", err);
      return { type: "error", paymentId: null };
    }
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

/** Reset cached provider (tests / hot reload). */
export function resetPaymentProvider(): void {
  provider = null;
}
