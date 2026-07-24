import { prisma } from "@/lib/db";
import {
  absoluteUrl,
  activationUrl,
  createEmailVerificationToken,
  formatEuroCents,
  sendEmail,
} from "@/lib/email/send";
import {
  accountActivatedEmail,
  driverApprovedEmail,
  offerAcceptedEmail,
  offerReceivedEmail,
  paymentConfirmedEmail,
  tripCompletedEmail,
  tripCreatedEmail,
  tripStartedEmail,
  verificationEmail,
} from "@/lib/email/templates";

export async function sendVerificationEmail(user: {
  id: string;
  email: string;
  name: string;
  locale?: string | null;
}) {
  const locale = user.locale || "pt";
  const token = await createEmailVerificationToken(user.email);
  const url = activationUrl(locale, token);
  const mail = verificationEmail({ name: user.name, activateUrl: url });
  return sendEmail({
    toEmail: user.email,
    toUserId: user.id,
    template: "verification",
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    meta: { token },
  });
}

export async function sendAccountActivatedEmail(user: {
  id: string;
  email: string;
  name: string;
  locale?: string | null;
}) {
  const locale = user.locale || "pt";
  const mail = accountActivatedEmail({
    name: user.name,
    loginUrl: absoluteUrl(`/${locale}/login`),
  });
  return sendEmail({
    toEmail: user.email,
    toUserId: user.id,
    template: "account_activated",
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });
}

export async function notifyTripCreated(opts: {
  customerId: string;
  tripId: string;
  pickup: string;
  dropoff: string;
}) {
  const user = await prisma.user.findUnique({ where: { id: opts.customerId } });
  if (!user) return;
  const locale = user.locale || "pt";
  const mail = tripCreatedEmail({
    name: user.name,
    tripUrl: absoluteUrl(`/${locale}/pedidos/${opts.tripId}`),
    pickup: opts.pickup,
    dropoff: opts.dropoff,
  });
  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "TRIP_CREATED",
      title: "Pedido criado",
      body: `${opts.pickup} → ${opts.dropoff}`,
      meta: JSON.stringify({ tripId: opts.tripId }),
    },
  });
  return sendEmail({
    toEmail: user.email,
    toUserId: user.id,
    template: "trip_created",
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    meta: { tripId: opts.tripId },
  });
}

export async function notifyOfferReceived(opts: {
  customerId: string;
  tripId: string;
  offerId: string;
  priceAmount: number;
  currency: string;
}) {
  const user = await prisma.user.findUnique({ where: { id: opts.customerId } });
  if (!user) return;
  const locale = user.locale || "pt";
  const priceLabel = formatEuroCents(opts.priceAmount, opts.currency);
  const mail = offerReceivedEmail({
    name: user.name,
    tripUrl: absoluteUrl(`/${locale}/pedidos/${opts.tripId}`),
    priceLabel,
  });
  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "OFFER_RECEIVED",
      title: "Nova proposta",
      body: `Recebeu uma proposta de ${priceLabel}.`,
      meta: JSON.stringify({ tripId: opts.tripId, offerId: opts.offerId }),
    },
  });
  return sendEmail({
    toEmail: user.email,
    toUserId: user.id,
    template: "offer_received",
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    meta: { tripId: opts.tripId, offerId: opts.offerId },
  });
}

export async function notifyOfferAccepted(opts: {
  driverId: string;
  tripId: string;
  offerId: string;
}) {
  const user = await prisma.user.findUnique({ where: { id: opts.driverId } });
  if (!user) return;
  const locale = user.locale || "pt";
  const mail = offerAcceptedEmail({
    name: user.name,
    tripUrl: absoluteUrl(`/${locale}/pedidos/${opts.tripId}`),
  });
  return sendEmail({
    toEmail: user.email,
    toUserId: user.id,
    template: "offer_accepted",
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    meta: { tripId: opts.tripId, offerId: opts.offerId },
  });
}

export async function notifyPaymentConfirmed(opts: {
  customerId: string;
  driverId: string;
  tripId: string;
  bookingId: string;
  amount: number;
  currency: string;
}) {
  const amountLabel = formatEuroCents(opts.amount, opts.currency);
  const [customer, driver] = await Promise.all([
    prisma.user.findUnique({ where: { id: opts.customerId } }),
    prisma.user.findUnique({ where: { id: opts.driverId } }),
  ]);
  if (customer) {
    const locale = customer.locale || "pt";
    const mail = paymentConfirmedEmail({
      name: customer.name,
      amountLabel,
      role: "customer",
      tripUrl: absoluteUrl(`/${locale}/pedidos/${opts.tripId}/confirmacao`),
    });
    await sendEmail({
      toEmail: customer.email,
      toUserId: customer.id,
      template: "payment_confirmed_customer",
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      meta: { bookingId: opts.bookingId, tripId: opts.tripId },
    });
  }
  if (driver) {
    const locale = driver.locale || "pt";
    const mail = paymentConfirmedEmail({
      name: driver.name,
      amountLabel,
      role: "driver",
      tripUrl: absoluteUrl(`/${locale}/pedidos/${opts.tripId}`),
    });
    await sendEmail({
      toEmail: driver.email,
      toUserId: driver.id,
      template: "payment_confirmed_driver",
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      meta: { bookingId: opts.bookingId, tripId: opts.tripId },
    });
  }
}

export async function notifyTripStarted(opts: { customerId: string; driverId: string; tripId: string }) {
  const users = await prisma.user.findMany({
    where: { id: { in: [opts.customerId, opts.driverId] } },
  });
  for (const user of users) {
    const locale = user.locale || "pt";
    const mail = tripStartedEmail({
      name: user.name,
      tripUrl: absoluteUrl(`/${locale}/pedidos/${opts.tripId}`),
    });
    await sendEmail({
      toEmail: user.email,
      toUserId: user.id,
      template: "trip_started",
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      meta: { tripId: opts.tripId },
    });
  }
}

export async function notifyTripCompleted(opts: { customerId: string; driverId: string; tripId: string }) {
  const users = await prisma.user.findMany({
    where: { id: { in: [opts.customerId, opts.driverId] } },
  });
  for (const user of users) {
    const locale = user.locale || "pt";
    const mail = tripCompletedEmail({
      name: user.name,
      tripUrl: absoluteUrl(`/${locale}/pedidos/${opts.tripId}`),
      receiptUrl: absoluteUrl(`/${locale}/pedidos/${opts.tripId}/confirmacao`),
    });
    await sendEmail({
      toEmail: user.email,
      toUserId: user.id,
      template: "trip_completed",
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      meta: { tripId: opts.tripId },
    });
  }
}

export async function notifyDriverApproved(opts: { userId: string }) {
  const user = await prisma.user.findUnique({ where: { id: opts.userId } });
  if (!user) return;
  const locale = user.locale || "pt";
  const mail = driverApprovedEmail({
    name: user.name,
    dashboardUrl: absoluteUrl(`/${locale}/painel`),
  });
  return sendEmail({
    toEmail: user.email,
    toUserId: user.id,
    template: "driver_approved",
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });
}
