import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";

export type SendEmailInput = {
  toEmail: string;
  toUserId?: string | null;
  template: string;
  subject: string;
  html: string;
  text?: string;
  meta?: Record<string, unknown>;
};

function appBaseUrl() {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.replace(/^/, "https://") ||
    process.env.VERCEL_URL?.replace(/^/, "https://") ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function absoluteUrl(path: string) {
  const base = appBaseUrl();
  if (path.startsWith("http")) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Always stores the email in EmailLog (demo mailbox).
 * Optionally delivers via Resend when RESEND_API_KEY is set.
 */
export async function sendEmail(input: SendEmailInput) {
  const resendKey = process.env.RESEND_API_KEY;
  let channel = "demo";
  let providerId: string | null = null;

  if (resendKey) {
    try {
      const from = process.env.EMAIL_FROM || "ZRIK <onboarding@resend.dev>";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [input.toEmail],
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { id?: string };
        channel = "resend";
        providerId = data.id || null;
      } else {
        const errText = await res.text();
        console.error("[email] Resend failed", res.status, errText);
        channel = "demo";
      }
    } catch (err) {
      console.error("[email] Resend error", err);
      channel = "demo";
    }
  } else {
    console.info(`[email:demo] → ${input.toEmail} · ${input.template} · ${input.subject}`);
  }

  const log = await prisma.emailLog.create({
    data: {
      toEmail: input.toEmail.toLowerCase(),
      toUserId: input.toUserId || null,
      subject: input.subject,
      template: input.template,
      htmlBody: input.html,
      textBody: input.text || null,
      meta: input.meta ? JSON.stringify(input.meta) : null,
      channel,
      providerId,
    },
  });

  return { id: log.id, channel, providerId };
}

export async function createEmailVerificationToken(email: string) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
  const identifier = email.toLowerCase();

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: { identifier, token, expires },
  });

  return token;
}

export function activationUrl(locale: string, token: string) {
  return absoluteUrl(`/${locale}/verificar-email?token=${encodeURIComponent(token)}`);
}

export function formatEuroCents(cents: number, currency = "EUR") {
  try {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}
