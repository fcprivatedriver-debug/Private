import type { PaymentIntent } from "@/types";
import type { PaymentProviderAdapter } from "./types";

/**
 * Placeholder adapter used until a real gateway is configured.
 * Throws on every call to avoid silent fake payments.
 */
export const unsetPaymentAdapter: PaymentProviderAdapter = {
  provider: "none",
  async createPaymentIntent() {
    throw new Error(
      "Payment provider not configured. Set NEXT_PUBLIC_PAYMENT_PROVIDER and implement an adapter.",
    );
  },
  async confirmPayment() {
    throw new Error("Payment provider not configured.");
  },
  async cancelPayment() {
    throw new Error("Payment provider not configured.");
  },
  async refundPayment() {
    throw new Error("Payment provider not configured.");
  },
  async getStatus(): Promise<PaymentIntent["status"]> {
    throw new Error("Payment provider not configured.");
  },
};

let activeAdapter: PaymentProviderAdapter = unsetPaymentAdapter;

export function setPaymentAdapter(adapter: PaymentProviderAdapter): void {
  activeAdapter = adapter;
}

export function getPaymentAdapter(): PaymentProviderAdapter {
  return activeAdapter;
}
