"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/actions/auth";
import { canCharge, getStripe } from "@/lib/stripe/client";
import { activateSubscriptionFromPayment } from "@/lib/payments/activate";
import { APP_URL } from "@/config/constants";
import { randomBytes } from "crypto";
import { addDays } from "date-fns";
import { notify } from "@/lib/notifications";

export async function startPlanCheckoutAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState & { redirectUrl?: string; demoPaymentId?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Inicie sessão." };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.emailVerified) {
    return { error: "Confirme o e-mail antes de contratar um plano." };
  }

  const planId = String(formData.get("planId") || "");
  const method = String(formData.get("method") || "CARD");
  const mbWayPhone = String(formData.get("mbWayPhone") || "") || null;

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.active) return { error: "Plano inválido." };
  if (!plan.showPrice || plan.tier === "diamond") {
    return { error: "O plano Diamante requer uma proposta personalizada." };
  }

  const subscription = await prisma.subscription.create({
    data: {
      userId: user.id,
      planId: plan.id,
      status: "PENDING_PAYMENT",
      minutesIncluded: plan.monthlyMinutes,
      autoRenew: true,
    },
  });

  const idempotencyKey = `sub_${user.id}_${plan.id}_${Date.now()}`;

  if (canCharge()) {
    const stripe = getStripe()!;
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      line_items: plan.stripePriceId
        ? [{ price: plan.stripePriceId, quantity: 1 }]
        : [
            {
              price_data: {
                currency: "eur",
                product_data: { name: plan.namePt },
                unit_amount: plan.priceCents,
                recurring: { interval: "month" },
              },
              quantity: 1,
            },
          ],
      success_url: `${APP_URL}/pt/cliente?paid=1`,
      cancel_url: `${APP_URL}/pt/planos?cancelled=1`,
      metadata: {
        userId: user.id,
        planId: plan.id,
        subscriptionId: subscription.id,
        kind: "SUBSCRIPTION",
      },
      payment_method_types: ["card"],
    });

    await prisma.payment.create({
      data: {
        userId: user.id,
        subscriptionId: subscription.id,
        kind: "SUBSCRIPTION",
        amountCents: plan.priceCents,
        method: method === "MB_WAY" ? "MB_WAY" : method === "MULTIBANCO" ? "MULTIBANCO" : "CARD",
        status: "PENDING",
        provider: "stripe",
        providerSessionId: checkout.id,
        mbWayPhone,
        idempotencyKey,
      },
    });

    return { success: "A redirecionar para pagamento…", redirectUrl: checkout.url || undefined };
  }

  // Demo / manual Multibanco-style pending payment
  const entity = "12345";
  const reference = String(Math.floor(100000000 + Math.random() * 899999999));
  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      subscriptionId: subscription.id,
      kind: "SUBSCRIPTION",
      amountCents: plan.priceCents,
      method: method === "MB_WAY" ? "MB_WAY" : method === "MULTIBANCO" ? "MULTIBANCO" : "CARD",
      status: "PENDING",
      provider: "demo",
      providerPaymentId: `demo_${randomBytes(8).toString("hex")}`,
      mbEntity: method === "MULTIBANCO" ? entity : null,
      mbReference: method === "MULTIBANCO" ? reference : null,
      mbWayPhone: method === "MB_WAY" ? mbWayPhone || user.phone : null,
      expiresAt: addDays(new Date(), 2),
      idempotencyKey,
    },
  });

  // In demo mode with CARD, auto-activate to keep UX usable without Stripe keys
  if (method === "CARD") {
    await activateSubscriptionFromPayment(payment.id);
    revalidatePath("/pt/cliente");
    return { success: "Pagamento de demonstração confirmado. Plano ativado.", demoPaymentId: payment.id };
  }

  return {
    success:
      method === "MULTIBANCO"
        ? `Pagamento Multibanco pendente. Entidade ${entity} · Ref. ${reference} · ${(plan.priceCents / 100).toFixed(2)} €`
        : "Pedido MB WAY pendente. Confirme no telemóvel (demo: use o botão de confirmar pagamento no painel).",
    demoPaymentId: payment.id,
  };
}

export async function buyExtraMinutesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState & { redirectUrl?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Inicie sessão." };

  const packageId = String(formData.get("packageId") || "");
  const pkg = await prisma.extraMinutePackage.findUnique({ where: { id: packageId } });
  if (!pkg || !pkg.active) return { error: "Pacote inválido." };

  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
  });
  if (!sub) return { error: "Precisa de um plano ativo." };

  const payment = await prisma.payment.create({
    data: {
      userId: session.user.id,
      subscriptionId: sub.id,
      kind: "EXTRA_MINUTES",
      amountCents: pkg.priceCents,
      method: "CARD",
      status: "PENDING",
      provider: canCharge() ? "stripe" : "demo",
      extraMinutes: pkg.minutes,
      idempotencyKey: `extra_${session.user.id}_${pkg.id}_${Date.now()}`,
    },
  });

  if (canCharge()) {
    const stripe = getStripe()!;
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: session.user.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: pkg.namePt },
            unit_amount: pkg.priceCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}/pt/minutos?paid=1`,
      cancel_url: `${APP_URL}/pt/minutos?cancelled=1`,
      metadata: {
        userId: session.user.id,
        paymentId: payment.id,
        kind: "EXTRA_MINUTES",
      },
    });
    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerSessionId: checkout.id },
    });
    return { success: "A redirecionar…", redirectUrl: checkout.url || undefined };
  }

  await activateSubscriptionFromPayment(payment.id);
  revalidatePath("/pt/minutos");
  revalidatePath("/pt/cliente");
  return { success: `${pkg.minutes} minutos adicionados (demo).` };
}

export async function confirmDemoPaymentAction(paymentId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { error: "Sem sessão." };
  if (session.user.role !== "ADMIN" && session.user.role !== "CUSTOMER") {
    return { error: "Sem permissão." };
  }

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return { error: "Pagamento não encontrado." };
  if (session.user.role === "CUSTOMER" && payment.userId !== session.user.id) {
    return { error: "Sem permissão." };
  }

  await activateSubscriptionFromPayment(paymentId);
  revalidatePath("/pt/cliente");
  revalidatePath("/pt/admin");
  return { success: "Pagamento confirmado e plano atualizado." };
}

export async function cancelSubscriptionAction(): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sem sessão." };

  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
  });
  if (!sub) return { error: "Sem subscrição ativa." };

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      cancelAtPeriodEnd: true,
      cancelledAt: new Date(),
      cancelledBy: "customer",
      autoRenew: false,
    },
  });

  await notify({
    userId: session.user.id,
    email: session.user.email,
    type: "PLAN_CANCELLED",
    title: "Cancelamento registado",
    body: "A renovação automática foi desativada. O plano mantém-se até ao fim do período atual.",
  });

  revalidatePath("/pt/cliente");
  return { success: "Cancelamento agendado para o fim do período." };
}
