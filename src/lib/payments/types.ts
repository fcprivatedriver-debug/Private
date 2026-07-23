export type CreateIntentInput = {
  bookingId: string;
  amount: number;
  currency: string;
  customerEmail: string;
  driverConnectAccountId?: string;
  platformFeeAmount: number;
};

export type CreateIntentResult = {
  status: "not_configured" | "created" | "error";
  provider: "NONE" | "STRIPE" | "MANUAL";
  amount: number;
  currency: string;
  message: string;
  clientSecret?: string;
  providerPaymentId?: string;
};

export type PaymentEvent = {
  type: string;
  paymentId: string | null;
};

export interface PaymentProvider {
  createPaymentIntent(input: CreateIntentInput): Promise<CreateIntentResult>;
  capture(paymentId: string): Promise<void>;
  refund(paymentId: string, amount?: number): Promise<void>;
  parseWebhook(rawBody: Buffer, signature: string): Promise<PaymentEvent>;
}
