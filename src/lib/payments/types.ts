import type { PaymentIntent, PaymentProvider, PaymentStatus } from "@/types";

/**
 * Payment provider contract — ready for Stripe / MB Way integration.
 * No provider is wired yet; implementations will live alongside this interface.
 */
export interface PaymentProviderAdapter {
  readonly provider: PaymentProvider;
  createPaymentIntent(input: {
    tripId: string;
    clientId: string;
    amountCents: number;
    currency?: "EUR";
    metadata?: Record<string, string>;
  }): Promise<PaymentIntent>;
  confirmPayment(paymentIntentId: string): Promise<PaymentIntent>;
  cancelPayment(paymentIntentId: string): Promise<PaymentIntent>;
  refundPayment(paymentIntentId: string, amountCents?: number): Promise<PaymentIntent>;
  getStatus(paymentIntentId: string): Promise<PaymentStatus>;
}

export function isPaymentSucceeded(status: PaymentStatus): boolean {
  return status === "succeeded";
}

export function requiresClientAction(status: PaymentStatus): boolean {
  return status === "requires_payment_method" || status === "requires_confirmation";
}
