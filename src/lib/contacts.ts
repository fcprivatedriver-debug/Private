import type { Booking, BookingStatus, Payment, PaymentStatus } from "@prisma/client";

/**
 * Contact details (phone/email) are revealed only after payment success.
 * This prevents parties from bypassing the ZRIK platform.
 */
export function isPaymentConfirmed(input: {
  bookingStatus: BookingStatus;
  paymentStatus?: PaymentStatus | null;
}): boolean {
  if (input.paymentStatus === "AUTHORIZED" || input.paymentStatus === "CAPTURED") {
    return true;
  }
  return input.bookingStatus === "PAID" || input.bookingStatus === "COMPLETED";
}

export function canRevealContacts(input: {
  viewerId: string;
  customerId: string;
  driverId: string;
  bookingStatus: BookingStatus;
  paymentStatus?: PaymentStatus | null;
  isAdmin?: boolean;
}): boolean {
  if (input.isAdmin) return true;
  const isParty =
    input.viewerId === input.customerId || input.viewerId === input.driverId;
  if (!isParty) return false;
  return isPaymentConfirmed({
    bookingStatus: input.bookingStatus,
    paymentStatus: input.paymentStatus,
  });
}

export function sanitizeUserContacts<T extends { phone?: string | null; email?: string | null }>(
  user: T,
  reveal: boolean,
): T {
  if (reveal) return user;
  return { ...user, phone: null, email: null };
}

export type BookingWithPayment = Booking & { payment?: Payment | null };
