import type {
  CreateIntentInput,
  CreateIntentResult,
  PaymentEvent,
  PaymentProvider,
} from "./types";

/** MVP stub — no real charges. Schema ready for Stripe Connect. */
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

let provider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (!provider) {
    provider = new NullPaymentProvider();
  }
  return provider;
}
