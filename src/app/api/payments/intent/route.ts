import { auth } from "@/lib/auth";
import { getPaymentProvider } from "@/lib/payments/provider";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { paymentsEnabled } from "@/config/env";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMER") {
    return apiError("UNAUTHORIZED", "Login necessário", 401);
  }

  const { bookingId } = await request.json();
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true, payment: true },
  });

  if (!booking || booking.customerId !== session.user.id) {
    return apiError("NOT_FOUND", "Reserva não encontrada", 404);
  }

  if (!paymentsEnabled()) {
    return Response.json({
      status: "not_configured",
      message:
        "Confirme o pagamento na aplicação para garantir a reserva. Active Stripe com PAYMENTS_ENABLED=true quando estiver pronto.",
      payment: booking.payment,
    });
  }

  const result = await getPaymentProvider().createPaymentIntent({
    bookingId: booking.id,
    amount: booking.totalAmount,
    currency: booking.currency,
    customerEmail: booking.customer.email,
    platformFeeAmount: booking.platformFeeAmount,
  });

  return Response.json(result);
}
