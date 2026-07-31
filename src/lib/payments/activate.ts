import { prisma } from "@/lib/db";
import { applyMinuteTransaction } from "@/lib/minutes/ledger";
import { notify } from "@/lib/notifications";
import { addMonths } from "date-fns";

export async function activateSubscriptionFromPayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { subscription: { include: { plan: true } }, user: true },
  });
  if (!payment) throw new Error("Payment not found");
  if (payment.status === "PAID") return payment;

  const now = new Date();
  const periodEnd = addMonths(now, 1);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: "PAID",
        paidAt: now,
        periodStart: now,
        periodEnd,
      },
    });

    if (payment.kind === "SUBSCRIPTION" && payment.subscriptionId) {
      // Cancel other active subscriptions for this user
      await tx.subscription.updateMany({
        where: {
          userId: payment.userId,
          status: "ACTIVE",
          id: { not: payment.subscriptionId },
        },
        data: { status: "CANCELLED", cancelledAt: now, cancelledBy: "system" },
      });

      const sub = await tx.subscription.update({
        where: { id: payment.subscriptionId },
        data: {
          status: "ACTIVE",
          periodStart: now,
          periodEnd,
          nextRenewalAt: periodEnd,
          minutesIncluded: payment.subscription!.plan.monthlyMinutes,
          minutesUsed: 0,
          minutesReserved: 0,
        },
        include: { plan: true },
      });

      await applyMinuteTransaction(
        {
          userId: payment.userId,
          subscriptionId: sub.id,
          type: "PLAN_RENEWAL",
          minutes: sub.plan.monthlyMinutes,
          reason: `Ativação do ${sub.plan.namePt}`,
          counter: "included",
        },
        tx,
      );

      await notify({
        userId: payment.userId,
        email: payment.user.email,
        type: "PLAN_ACTIVATED",
        title: "Plano ativado",
        body: `O seu ${sub.plan.namePt} está ativo com ${sub.plan.monthlyMinutes} minutos.`,
      });
    }

    if (payment.kind === "EXTRA_MINUTES" && payment.extraMinutes && payment.subscriptionId) {
      await applyMinuteTransaction(
        {
          userId: payment.userId,
          subscriptionId: payment.subscriptionId,
          type: "EXTRA_PURCHASE",
          minutes: payment.extraMinutes,
          reason: `Compra de ${payment.extraMinutes} minutos adicionais`,
          counter: "included",
        },
        tx,
      );

      await notify({
        userId: payment.userId,
        email: payment.user.email,
        type: "EXTRA_MINUTES",
        title: "Minutos adicionados",
        body: `Foram adicionados ${payment.extraMinutes} minutos à sua conta.`,
      });
    }

    await notify({
      userId: payment.userId,
      email: payment.user.email,
      type: "PAYMENT_RECEIVED",
      title: "Pagamento recebido",
      body: `Recebemos o seu pagamento de ${(payment.amountCents / 100).toFixed(2)} €.`,
    });

    return updated;
  });
}
