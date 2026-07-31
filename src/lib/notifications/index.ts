import { prisma } from "@/lib/db";
import { NotificationChannel, NotificationStatus } from "@prisma/client";
import { APP_URL } from "@/config/constants";

type NotifyInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  email?: string;
  meta?: Record<string, unknown>;
  channels?: NotificationChannel[];
};

export async function notify(input: NotifyInput) {
  const channels = input.channels ?? ["IN_APP", "EMAIL"];
  const created = [];

  for (const channel of channels) {
    const row = await prisma.notification.create({
      data: {
        userId: input.userId,
        channel,
        type: input.type,
        title: input.title,
        body: input.body,
        status: NotificationStatus.PENDING,
        meta: input.meta ? JSON.stringify(input.meta) : null,
      },
    });

    if (channel === "IN_APP") {
      await prisma.notification.update({
        where: { id: row.id },
        data: { status: NotificationStatus.SENT, sentAt: new Date() },
      });
    } else if (channel === "EMAIL" && input.email) {
      const sent = await sendEmail({
        to: input.email,
        subject: input.title,
        html: emailShell(input.title, input.body),
      });
      await prisma.notification.update({
        where: { id: row.id },
        data: {
          status: sent ? NotificationStatus.SENT : NotificationStatus.FAILED,
          sentAt: sent ? new Date() : null,
        },
      });
    } else if (channel === "WHATSAPP" || channel === "SMS") {
      // Prepared for later official integrations — do not auto-send
      await prisma.notification.update({
        where: { id: row.id },
        data: { status: NotificationStatus.PENDING },
      });
    }

    created.push(row);
  }

  return created;
}

export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "FC Private Driver <fcprivatedriver@gmail.com>";

  if (!apiKey) {
    console.info("[email:demo]", opts.to, opts.subject);
    return true;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
    });
    return res.ok;
  } catch (err) {
    console.error("[email] failed", err);
    return false;
  }
}

export function emailShell(title: string, body: string, cta?: { label: string; href: string }) {
  const button = cta
    ? `<p style="margin:28px 0"><a href="${cta.href}" style="background:#0A4F5C;color:#fff;padding:14px 22px;border-radius:6px;text-decoration:none;font-weight:600">${cta.label}</a></p>`
    : "";
  return `<!doctype html><html><body style="font-family:Georgia,serif;background:#f5f7f8;padding:24px;color:#1a1a1a">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e6eef0;padding:32px">
    <div style="font-size:13px;letter-spacing:.18em;color:#0A4F5C;font-weight:700;margin-bottom:18px">FC PRIVATE DRIVER</div>
    <h1 style="font-size:24px;margin:0 0 12px">${title}</h1>
    <p style="line-height:1.6;color:#444">${body}</p>
    ${button}
    <p style="margin-top:36px;font-size:12px;color:#777">fcprivatedriver@gmail.com · +351 933 239 595</p>
  </div></body></html>`;
}

export function activationEmailHtml(token: string) {
  const href = `${APP_URL}/pt/ativar?token=${token}`;
  return emailShell(
    "Ative a sua conta",
    "Obrigado por se registar na FC Private Driver. Clique no botão abaixo para confirmar o seu e-mail e ativar a conta.",
    { label: "Ativar conta", href },
  );
}
