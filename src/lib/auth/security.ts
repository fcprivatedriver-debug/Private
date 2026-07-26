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
  const from = process.env.EMAIL_FROM || "Nina <no-reply@ninapp.pt>";

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

export function appBaseUrl(): string {
  return (
    process.env.AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://127.0.0.1:3000"
  ).replace(/\/$/, "");
}
