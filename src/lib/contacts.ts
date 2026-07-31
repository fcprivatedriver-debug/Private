import type { PaymentStatus, TripStatus } from "@prisma/client";

/** FC Private Driver — driver contact revealed after trip confirmation. */
export function isTripConfirmed(status: TripStatus): boolean {
  return !["AWAITING_CONFIRMATION", "CANCELLED", "NO_SHOW"].includes(status);
}

export function isPaymentConfirmed(paymentStatus?: PaymentStatus | null): boolean {
  return paymentStatus === "PAID";
}

export function canRevealDriverContacts(input: {
  viewerId: string;
  customerId: string;
  driverUserId?: string | null;
  tripStatus: TripStatus;
  isAdmin?: boolean;
}): boolean {
  if (input.isAdmin) return true;
  if (input.viewerId !== input.customerId) return false;
  if (!input.driverUserId) return false;
  return isTripConfirmed(input.tripStatus);
}

export function sanitizeUserContacts<T extends { phone?: string | null; email?: string | null }>(
  user: T,
  reveal: boolean,
): T {
  if (reveal) return user;
  return { ...user, phone: null, email: null };
}
