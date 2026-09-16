import { APP_NAME } from "@/config/brand";
import { sendAppEmail, appBaseUrl } from "@/lib/auth/security";

export async function sendFamilyInviteEmail(opts: {
  toEmail: string;
  inviterName: string;
  inviteeName?: string | null;
  familyName: string;
  invitePath: string;
}) {
  const url = `${appBaseUrl()}${opts.invitePath.startsWith("/") ? opts.invitePath : `/${opts.invitePath}`}`;
  const who = opts.inviterName.split(" ")[0] || "Alguém";
  const hello = opts.inviteeName ? `Olá ${opts.inviteeName},\n\n` : "";
  const subject = `Foste convidado para uma Família na ${APP_NAME}`;
  const text =
    `${hello}${who} convidou-te para fazeres parte da Família ${opts.familyName} na ${APP_NAME}.\n\n` +
    `Aceitar convite:\n${url}\n\n` +
    `Usa sempre a tua própria conta — nunca partilhes a palavra-passe de outra pessoa.\n\n— ${APP_NAME}`;

  const html = `
<!DOCTYPE html>
<html lang="pt">
<body style="font-family:Georgia,serif;background:#f6f4ef;padding:24px;color:#1a1a1a;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:28px 24px;border:1px solid #e8e2d6;">
    <p style="margin:0 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6b6358;">${APP_NAME}</p>
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">Foste convidado para uma Família</h1>
    <p style="margin:0 0 20px;font-size:16px;line-height:1.5;">
      <strong>${escapeHtml(who)}</strong> convidou-te para fazeres parte da Família
      <strong>${escapeHtml(opts.familyName)}</strong> na ${APP_NAME}.
    </p>
    <p style="margin:0 0 28px;">
      <a href="${escapeHtml(url)}"
         style="display:inline-block;background:#1e3a5f;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
        Aceitar convite
      </a>
    </p>
    <p style="margin:0;font-size:13px;color:#6b6358;line-height:1.4;">
      Usa sempre a tua própria conta. Se o botão não funcionar, copia este link:<br/>
      <span style="word-break:break-all;">${escapeHtml(url)}</span>
    </p>
  </div>
</body>
</html>`.trim();

  return sendAppEmail({ to: opts.toEmail, subject, text, html });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
