export type PaymentStatus =
  | "requires_payment_method"
  | "requires_confirmation"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "refunded";

export type PaymentProvider = "stripe" | "mbway" | "manual" | "none";

export interface PaymentIntent {
  id: string;
  tripId: string;
  clientId: string;
  amountCents: number;
  currency: "EUR";
  status: PaymentStatus;
  provider: PaymentProvider;
  providerReference?: string;
  createdAt: string;
  updatedAt: string;
}
