/**
 * Authentication Service — tokens e email (server-only).
 */

import { createHash, randomBytes } from "crypto";
import { validatePassword, PASSWORD_HINT } from "./password-rules";

export { validatePassword, PASSWORD_HINT };

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function createRawToken(): string {
  return randomBytes(32).toString("hex");
}

export type MailResult =
  | { ok: true; delivered: boolean; previewUrl?: string }
  | { ok: false; error: string };

export async function sendAppEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<MailResult> {
  const resendKey = process.env.RESEND_API_KEY;
  const from =
    process.env.EMAIL_FROM || "addYknow <no-reply@addandknow.pt>";

  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: opts.to,
          subject: opts.subject,
          text: opts.text,
          html: opts.html || opts.text.replace(/\n/g, "<br/>"),
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error("[mail] resend failed", res.status, body);
        return { ok: false, error: "Não consegui enviar o email agora." };
      }
      return { ok: true, delivered: true };
    } catch (err) {
      console.error("[mail] resend error", err);
      return { ok: false, error: "Não consegui enviar o email agora." };
    }
  }

  console.info("[mail:dev]", { to: opts.to, subject: opts.subject, text: opts.text });
  return { ok: true, delivered: false };
}

/**
 * URL canónica para links em emails.
 * Em produção usa sempre o domínio público (nunca localhost / preview Vercel).
 */
export function appBaseUrl(): string {
  const explicit =
    process.env.AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "";

  const isProd =
    process.env.VERCEL_ENV === "production" ||
    (process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview");

  if (isProd) {
    const canonical =
      process.env.APP_CANONICAL_URL ||
      process.env.AUTH_URL ||
      "https://addandknow.pt";
    // Preferir domínio canónico se AUTH_URL apontar para preview/localhost
    if (/localhost|127\.0\.0\.1|vercel\.app/i.test(canonical) === false) {
      return canonical.replace(/\/$/, "");
    }
    return "https://addandknow.pt";
  }

  if (explicit) return explicit.replace(/\/$/, "");
  return "http://127.0.0.1:3000";
}
