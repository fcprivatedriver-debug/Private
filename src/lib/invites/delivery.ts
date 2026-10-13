/**
 * Entrega de convites familiares — canal separado do token.
 * Resend = email. SMS fica preparado sem fornecedor ativo.
 */

import { sendAppEmail, appBaseUrl, allowDevMailPreview } from "@/lib/auth/security";
import { APP_NAME } from "@/config/brand";

export type InviteDeliveryChannel = "EMAIL" | "PHONE" | "LINK";

export type InviteDeliveryResult =
  | {
      ok: true;
      delivered: boolean;
      channel: InviteDeliveryChannel;
      previewUrl?: string;
      providerMessageId?: string;
    }
  | {
      ok: false;
      error: string;
      channel: InviteDeliveryChannel;
      code?: "RESEND_MISSING" | "RESEND_API_ERROR";
    };

export async function deliverFamilyInvite(opts: {
  channel: InviteDeliveryChannel;
  toEmail?: string | null;
  toPhone?: string | null;
  inviteeName: string;
  familyName: string;
  /** Nome de quem convida (ex.: Filipe) */
  inviterName?: string;
  invitePath: string;
}): Promise<InviteDeliveryResult> {
  const url = `${appBaseUrl()}${opts.invitePath}`;
  const inviter = (opts.inviterName || "").trim() || "Alguém";

  if (opts.channel === "EMAIL") {
    if (!opts.toEmail) {
      return { ok: false, error: "Email do destinatário em falta.", channel: "EMAIL" };
    }
    const text = [
      `Olá ${opts.inviteeName},`,
      ``,
      `${inviter} convidou-te para fazer parte da ${opts.familyName} no ${APP_NAME}.`,
      ``,
      `Aceita o convite aqui (cria a tua própria conta se ainda não tiveres):`,
      url,
      ``,
      `— ${APP_NAME}`,
    ].join("\n");
    const html = `
      <p>Olá <strong>${escapeHtml(opts.inviteeName)}</strong>,</p>
      <p><strong>${escapeHtml(inviter)}</strong> convidou-te para fazer parte da
      <strong>${escapeHtml(opts.familyName)}</strong> no ${escapeHtml(APP_NAME)}.</p>
      <p style="margin:24px 0">
        <a href="${escapeAttr(url)}"
           style="background:#245563;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block">
          Aceitar convite
        </a>
      </p>
      <p style="color:#527273;font-size:13px">Ou abre este link:<br/>
        <a href="${escapeAttr(url)}">${escapeHtml(url)}</a>
      </p>
      <p>— ${escapeHtml(APP_NAME)}</p>
    `;
    const mail = await sendAppEmail({
      to: opts.toEmail,
      subject: `${inviter} convidou-te para a ${opts.familyName} — ${APP_NAME}`,
      text,
      html,
    });
    if (!mail.ok) {
      return {
        ok: false,
        error: mail.error,
        channel: "EMAIL",
        code: mail.code,
      };
    }
    return {
      ok: true,
      delivered: mail.delivered,
      channel: "EMAIL",
      providerMessageId: mail.providerMessageId,
      // Só expor URL no UI em development local quando Resend não entregou.
      previewUrl: !mail.delivered && allowDevMailPreview() ? url : undefined,
    };
  }

  if (opts.channel === "PHONE") {
    // Sem fornecedor SMS — não fingir envio. Link relativo é suficiente no UI
    // (InviteShare usa window.location.origin); não devolver localhost absoluto.
    return {
      ok: true,
      delivered: false,
      channel: "PHONE",
      previewUrl: allowDevMailPreview() ? url : undefined,
    };
  }

  return {
    ok: true,
    delivered: false,
    channel: "LINK",
    previewUrl: allowDevMailPreview() ? url : undefined,
  };
}

/** SMS activo? Sempre false até haver integração autorizada. */
export function isSmsDeliveryConfigured(): boolean {
  return Boolean(process.env.SMS_PROVIDER && process.env.SMS_API_KEY);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}
