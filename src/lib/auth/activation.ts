import { randomBytes } from "crypto";
import { addHours } from "date-fns";
import { prisma } from "@/lib/db";
import { APP_URL } from "@/config/constants";
import { sendEmail, emailShell, type SendEmailResult } from "@/lib/notifications";

export const ACTIVATION_SUBJECT = "Confirme a sua conta — FC Private Driver";
export const ACTIVATION_SUBJECT_EN = "Confirm your account — FC Private Driver";
export const ACTIVATED_SUBJECT = "Conta ativada — FC Private Driver";
export const ACTIVATION_TTL_HOURS = 24;

export type ActivationSendResult = {
  token: string;
  email: SendEmailResult;
};

/** Create a fresh 24h activation token (invalidates unused previous ones). */
export async function createActivationToken(userId: string): Promise<string> {
  await prisma.emailConfirmToken.deleteMany({
    where: { userId, usedAt: null },
  });

  const token = randomBytes(32).toString("hex");
  await prisma.emailConfirmToken.create({
    data: {
      userId,
      token,
      expiresAt: addHours(new Date(), ACTIVATION_TTL_HOURS),
    },
  });
  return token;
}

export function activationLink(token: string, locale = "pt") {
  return `${APP_URL}/${locale}/ativar?token=${encodeURIComponent(token)}`;
}

export function buildActivationEmailHtml(name: string, token: string, locale = "pt") {
  const href = activationLink(token, locale);
  const safeName = escapeHtml(name || "Cliente");
  const isPt = !locale.startsWith("en");

  if (!isPt) {
    return emailShell(
      "Confirm your account",
      `Hello, ${safeName}.<br/><br/>Thank you for creating your account with FC Private Driver.<br/><br/>To activate your account, click the button below.`,
      { label: "Activate account", href },
    );
  }

  return `<!doctype html>
<html lang="pt">
<body style="margin:0;padding:0;background:#f5f7f8;font-family:Georgia,'Times New Roman',serif;color:#1a1a1a">
  <div style="max-width:560px;margin:0 auto;padding:28px 16px">
    <div style="background:#ffffff;border:1px solid #e6eef0;padding:36px 32px">
      <div style="font-size:12px;letter-spacing:.18em;color:#0A4F5C;font-weight:700;margin-bottom:22px">
        FC PRIVATE DRIVER
      </div>
      <p style="font-size:17px;line-height:1.55;margin:0 0 16px">Olá, ${safeName}.</p>
      <p style="font-size:16px;line-height:1.6;margin:0 0 16px;color:#333">
        Obrigado por criar a sua conta na FC Private Driver.
      </p>
      <p style="font-size:16px;line-height:1.6;margin:0 0 24px;color:#333">
        Para ativar a sua conta, clique no botão abaixo.
      </p>
      <p style="margin:0 0 28px">
        <a href="${href}"
           style="display:inline-block;background:#0A4F5C;color:#ffffff;padding:14px 26px;border-radius:6px;text-decoration:none;font-weight:600;font-family:system-ui,-apple-system,sans-serif;font-size:15px">
          Ativar conta
        </a>
      </p>
      <p style="font-size:14px;line-height:1.55;margin:0 0 8px;color:#555">
        Caso o botão não funcione, copie e cole este endereço no navegador:
      </p>
      <p style="font-size:13px;line-height:1.5;margin:0 0 20px;word-break:break-all">
        <a href="${href}" style="color:#0A4F5C">${href}</a>
      </p>
      <p style="font-size:14px;line-height:1.55;margin:0 0 12px;color:#555">
        Este link expira ao fim de 24 horas.
      </p>
      <p style="font-size:14px;line-height:1.55;margin:0 0 28px;color:#555">
        Se não criou esta conta, ignore este e-mail.
      </p>
      <p style="font-size:15px;line-height:1.55;margin:0;color:#333">
        Obrigado,<br/>
        Equipa FC Private Driver
      </p>
      <p style="margin-top:32px;font-size:12px;color:#888">
        Apoio: fcprivatedriver@gmail.com · +351 933 239 595
      </p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Create token + send activation email; logs failures to AdminAuditLog. */
export async function issueAndSendActivationEmail(opts: {
  userId: string;
  email: string;
  name: string;
  locale?: string;
  actorId?: string | null;
  reason?: string;
}): Promise<ActivationSendResult> {
  const token = await createActivationToken(opts.userId);
  const html = buildActivationEmailHtml(opts.name, token, opts.locale || "pt");

  const emailResult = await sendEmail({
    to: opts.email,
    subject: ACTIVATION_SUBJECT,
    html,
  });

  if (!emailResult.ok) {
    await prisma.adminAuditLog.create({
      data: {
        actorId: opts.actorId || null,
        action: "ACTIVATION_EMAIL_FAILED",
        entityType: "User",
        entityId: opts.userId,
        reason: opts.reason || "Falha no envio do e-mail de ativação",
        meta: JSON.stringify({
          email: opts.email,
          error: emailResult.error || "unknown",
        }),
      },
    });
    console.error("[activation-email] failed", {
      userId: opts.userId,
      email: opts.email,
      error: emailResult.error,
    });
  } else {
    await prisma.adminAuditLog.create({
      data: {
        actorId: opts.actorId || null,
        action: "ACTIVATION_EMAIL_SENT",
        entityType: "User",
        entityId: opts.userId,
        reason: opts.reason || "E-mail de ativação enviado",
        meta: JSON.stringify({ email: opts.email, demo: emailResult.demo || false }),
      },
    });
  }

  return { token, email: emailResult };
}

export async function sendAccountActivatedEmail(opts: {
  email: string;
  name: string;
}) {
  return sendEmail({
    to: opts.email,
    subject: ACTIVATED_SUBJECT,
    html: emailShell(
      "Conta ativada",
      `Olá, ${escapeHtml(opts.name)}.<br/><br/>A sua conta foi ativada com sucesso. Já pode escolher o seu plano e começar a utilizar o serviço.`,
      {
        label: "Escolher plano",
        href: `${APP_URL}/pt/planos`,
      },
    ),
  });
}
