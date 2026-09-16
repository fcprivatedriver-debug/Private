/**
 * Entrega de convites familiares — canal separado do token.
 * Resend = email. SMS fica preparado sem fornecedor ativo.
 */

import { appBaseUrl } from "@/lib/auth/security";
import { sendFamilyInviteEmail } from "@/lib/invites/email";

export type InviteDeliveryChannel = "EMAIL" | "PHONE" | "LINK";

export type InviteDeliveryResult =
  | { ok: true; delivered: boolean; channel: InviteDeliveryChannel; previewUrl?: string }
  | { ok: false; error: string; channel: InviteDeliveryChannel };

export async function deliverFamilyInvite(opts: {
  channel: InviteDeliveryChannel;
  toEmail?: string | null;
  toPhone?: string | null;
  inviteeName: string;
  inviterName: string;
  familyName: string;
  invitePath: string;
}): Promise<InviteDeliveryResult> {
  const url = `${appBaseUrl()}${opts.invitePath}`;

  if (opts.channel === "EMAIL") {
    if (!opts.toEmail) {
      return { ok: false, error: "Email do destinatário em falta.", channel: "EMAIL" };
    }
    const mail = await sendFamilyInviteEmail({
      toEmail: opts.toEmail,
      inviterName: opts.inviterName,
      inviteeName: opts.inviteeName,
      familyName: opts.familyName,
      invitePath: opts.invitePath,
    });
    if (!mail.ok) {
      return { ok: false, error: mail.error, channel: "EMAIL" };
    }
    return {
      ok: true,
      delivered: mail.delivered,
      channel: "EMAIL",
      previewUrl: mail.delivered ? undefined : url,
    };
  }

  if (opts.channel === "PHONE") {
    // Sem fornecedor SMS — não fingir envio.
    return {
      ok: true,
      delivered: false,
      channel: "PHONE",
      previewUrl: url,
    };
  }

  return { ok: true, delivered: false, channel: "LINK", previewUrl: url };
}

/** SMS activo? Sempre false até haver integração autorizada. */
export function isSmsDeliveryConfigured(): boolean {
  return Boolean(process.env.SMS_PROVIDER && process.env.SMS_API_KEY);
}
