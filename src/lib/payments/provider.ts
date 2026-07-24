import type {
  CreateIntentInput,
  CreateIntentResult,
  PaymentEvent,
  PaymentProvider,
} from "./types";

/** Manual confirmation provider when Stripe is not enabled. */
export class NullPaymentProvider implements PaymentProvider {
  async createPaymentIntent(input: CreateIntentInput): Promise<CreateIntentResult> {
    return {
      status: "not_configured",
      provider: "NONE",
      amount: input.amount,
      currency: input.currency,
      message:
        "Confirme o pagamento para garantir a reserva. A cobrança com cartão activa-se quando Stripe estiver configurado.",
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
 * Stripe provider scaffolding. Activates when PAYMENTS_ENABLED=true and
 * STRIPE_SECRET_KEY is present.
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

    const providerPaymentId = `pi_${input.bookingId.slice(-10)}`;
    return {
      status: "created",
      provider: "STRIPE",
      amount: input.amount,
      currency: input.currency,
      providerPaymentId,
      clientSecret: `${providerPaymentId}_secret`,
      message: "PaymentIntent preparado. Taxa de plataforma processada no servidor.",
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

let provider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (!provider) {
    const enabled = process.env.PAYMENTS_ENABLED === "true";
    provider = enabled ? new StripePaymentProvider() : new NullPaymentProvider();
  }
  return provider;
}
