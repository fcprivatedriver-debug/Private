/** ZRIK transactional email HTML helpers — responsive, brand-aligned. */

const ACCENT = "#1F5A96";
const INK = "#111111";
const MUTED = "#5a5a62";
const BG = "#f7f7f8";

export type EmailContent = {
  subject: string;
  preheader?: string;
  headline: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  footerNote?: string;
};

export function wrapZrikEmail(content: EmailContent): { subject: string; html: string; text: string } {
  const cta = content.cta
    ? `<p style="margin:28px 0 8px"><a href="${content.cta.url}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;letter-spacing:0.02em;padding:14px 22px;border-radius:8px">${content.cta.label}</a></p>
       <p style="margin:0;font-size:12px;color:${MUTED};word-break:break-all">Ou abra: ${content.cta.url}</p>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escapeHtml(content.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${INK}">
  ${content.preheader ? `<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(content.preheader)}</div>` : ""}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BG};padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid rgba(17,17,17,0.08);border-radius:12px;overflow:hidden">
        <tr><td style="padding:22px 24px 8px;border-bottom:1px solid rgba(17,17,17,0.06)">
          <div style="font-size:22px;font-weight:700;letter-spacing:-0.06em"><span style="color:${ACCENT}">Z</span><span style="color:${INK}">RIK</span></div>
          <div style="margin-top:4px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:${MUTED}">Mobilidade privada</div>
        </td></tr>
        <tr><td style="padding:28px 24px 8px">
          <h1 style="margin:0 0 14px;font-size:22px;line-height:1.25;letter-spacing:-0.03em">${escapeHtml(content.headline)}</h1>
          <div style="font-size:15px;line-height:1.55;color:${MUTED}">${content.bodyHtml}</div>
          ${cta}
        </td></tr>
        <tr><td style="padding:20px 24px 28px;font-size:12px;line-height:1.45;color:${MUTED}">
          ${content.footerNote || "ZRIK — marketplace de chauffeurs privados."}
          <br/>Este email foi enviado automaticamente. Não responda a esta mensagem.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    "ZRIK",
    content.headline,
    stripTags(content.bodyHtml),
    content.cta ? `${content.cta.label}: ${content.cta.url}` : "",
    content.footerNote || "ZRIK — marketplace de chauffeurs privados.",
  ]
    .filter(Boolean)
    .join("\n\n");

  return { subject: content.subject, html, text };
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function stripTags(s: string) {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function verificationEmail(opts: { name: string; activateUrl: string }) {
  return wrapZrikEmail({
    subject: "Ative a sua conta ZRIK",
    preheader: "Confirme o email para começar a pedir viagens.",
    headline: `Olá, ${opts.name}`,
    bodyHtml: `<p style="margin:0 0 12px">Obrigado por se registar na ZRIK. Para ativar a conta, confirme o seu email.</p><p style="margin:0">Enquanto a conta estiver pendente, não poderá iniciar sessão.</p>`,
    cta: { label: "ATIVAR CONTA", url: opts.activateUrl },
  });
}

export function accountActivatedEmail(opts: { name: string; loginUrl: string }) {
  return wrapZrikEmail({
    subject: "Conta ZRIK ativada",
    headline: "A sua conta está ativa",
    bodyHtml: `<p style="margin:0">Olá ${escapeHtml(opts.name)}, a verificação foi concluída. Já pode entrar e usar a ZRIK.</p>`,
    cta: { label: "Entrar", url: opts.loginUrl },
  });
}

export function tripCreatedEmail(opts: { name: string; tripUrl: string; pickup: string; dropoff: string }) {
  return wrapZrikEmail({
    subject: "Pedido de viagem criado — ZRIK",
    headline: "Pedido publicado",
    bodyHtml: `<p style="margin:0 0 12px">Olá ${escapeHtml(opts.name)}, o seu pedido foi criado.</p><p style="margin:0"><strong>De:</strong> ${escapeHtml(opts.pickup)}<br/><strong>Para:</strong> ${escapeHtml(opts.dropoff)}</p>`,
    cta: { label: "Ver pedido", url: opts.tripUrl },
  });
}

export function offerReceivedEmail(opts: { name: string; tripUrl: string; priceLabel: string }) {
  return wrapZrikEmail({
    subject: "Nova proposta recebida — ZRIK",
    headline: "Tem uma nova proposta",
    bodyHtml: `<p style="margin:0 0 12px">Olá ${escapeHtml(opts.name)}, um motorista enviou uma proposta de <strong>${escapeHtml(opts.priceLabel)}</strong>.</p>`,
    cta: { label: "Comparar propostas", url: opts.tripUrl },
  });
}

export function offerAcceptedEmail(opts: { name: string; tripUrl: string }) {
  return wrapZrikEmail({
    subject: "Proposta aceite — ZRIK",
    headline: "A sua proposta foi aceite",
    bodyHtml: `<p style="margin:0">Olá ${escapeHtml(opts.name)}, o cliente aceitou a sua proposta. Aguarde a confirmação do pagamento.</p>`,
    cta: { label: "Abrir viagem", url: opts.tripUrl },
  });
}

export function paymentConfirmedEmail(opts: { name: string; tripUrl: string; amountLabel: string; role: "customer" | "driver" }) {
  const body =
    opts.role === "customer"
      ? `<p style="margin:0">Pagamento de <strong>${escapeHtml(opts.amountLabel)}</strong> confirmado. A reserva está garantida.</p>`
      : `<p style="margin:0">O pagamento de <strong>${escapeHtml(opts.amountLabel)}</strong> foi confirmado. Prepare-se para o encontro.</p>`;
  return wrapZrikEmail({
    subject: "Pagamento confirmado — ZRIK",
    headline: "Reserva confirmada",
    bodyHtml: body,
    cta: { label: "Ver reserva", url: opts.tripUrl },
  });
}

export function tripStartedEmail(opts: { name: string; tripUrl: string }) {
  return wrapZrikEmail({
    subject: "Viagem iniciada — ZRIK",
    headline: "A viagem começou",
    bodyHtml: `<p style="margin:0">Olá ${escapeHtml(opts.name)}, o estado da viagem foi atualizado para <strong>em curso</strong>.</p>`,
    cta: { label: "Acompanhar", url: opts.tripUrl },
  });
}

export function tripCompletedEmail(opts: { name: string; tripUrl: string; receiptUrl?: string }) {
  return wrapZrikEmail({
    subject: "Viagem concluída — ZRIK",
    headline: "Obrigado por viajar connosco",
    bodyHtml: `<p style="margin:0 0 12px">Olá ${escapeHtml(opts.name)}, a viagem foi concluída. O histórico e o recibo ficam disponíveis na sua conta.</p>`,
    cta: { label: "Ver recibo / histórico", url: opts.receiptUrl || opts.tripUrl },
  });
}

export function driverApprovedEmail(opts: { name: string; dashboardUrl: string }) {
  return wrapZrikEmail({
    subject: "Motorista aprovado — ZRIK",
    headline: "Já pode enviar propostas",
    bodyHtml: `<p style="margin:0">Olá ${escapeHtml(opts.name)}, a verificação foi aprovada. A sua conta de motorista está ativa.</p>`,
    cta: { label: "Abrir painel", url: opts.dashboardUrl },
  });
}
