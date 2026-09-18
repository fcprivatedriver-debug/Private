/**
 * Authentication Service — tokens e email (server-only).
 */

import { createHash, randomBytes } from "crypto";
import { validatePassword, PASSWORD_HINT } from "./password-rules";

export { validatePassword, PASSWORD_HINT };

/** Domínio público canónico de Production (addYknow). */
export const PRODUCTION_APP_ORIGIN = "https://addandknow.pt";

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

function isLoopbackHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]";
}

function isLoopbackUrl(raw: string): boolean {
  try {
    return isLoopbackHost(new URL(raw).hostname);
  } catch {
    return /localhost|127\.0\.0\.1/i.test(raw);
  }
}

function normalizeOrigin(raw: string): string {
  return raw.trim().replace(/\/$/, "");
}

/**
 * True only on a local machine (não Vercel). Permite links de preview
 * quando Resend não está configurado — nunca em Production/Preview.
 */
export function allowDevMailPreview(): boolean {
  if (process.env.VERCEL) return false;
  if (process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview") {
    return false;
  }
  return process.env.NODE_ENV !== "production";
}

/**
 * Base URL pública para links enviados por email (verificação, reset, convites).
 *
 * Prioridade:
 * 1. AUTH_URL / NEXT_PUBLIC_APP_URL (se válidos)
 * 2. Production → https://addandknow.pt
 * 3. Preview Vercel → https://$VERCEL_URL
 * 4. Development local → http://127.0.0.1:3000
 *
 * Nunca devolve localhost/127.0.0.1 em Production ou Preview.
 */
export function appBaseUrl(): string {
  const explicit = normalizeOrigin(
    process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "",
  );
  const vercelEnv = process.env.VERCEL_ENV; // production | preview | development
  const onVercel = Boolean(process.env.VERCEL) || Boolean(vercelEnv);

  if (explicit) {
    if (isLoopbackUrl(explicit) && (onVercel || process.env.NODE_ENV === "production")) {
      console.error(
        "[appBaseUrl] AUTH_URL/NEXT_PUBLIC_APP_URL aponta para loopback em ambiente deployed — a ignorar:",
        explicit,
      );
    } else {
      return explicit;
    }
  }

  if (vercelEnv === "production") {
    if (!explicit) {
      console.error(
        "[appBaseUrl] AUTH_URL ausente em Production — a usar",
        PRODUCTION_APP_ORIGIN,
      );
    }
    return PRODUCTION_APP_ORIGIN;
  }

  if (vercelEnv === "preview" || (onVercel && process.env.VERCEL_URL)) {
    const host = (process.env.VERCEL_URL || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (host && !isLoopbackHost(host)) {
      return `https://${host}`;
    }
    console.error(
      "[appBaseUrl] VERCEL_URL inválido em Preview — a usar",
      PRODUCTION_APP_ORIGIN,
    );
    return PRODUCTION_APP_ORIGIN;
  }

  // NODE_ENV=production fora da Vercel (container/CI) — domínio canónico, nunca loopback.
  if (process.env.NODE_ENV === "production") {
    console.error(
      "[appBaseUrl] AUTH_URL ausente com NODE_ENV=production — a usar",
      PRODUCTION_APP_ORIGIN,
    );
    return PRODUCTION_APP_ORIGIN;
  }

  // Development local apenas.
  return "http://127.0.0.1:3000";
}
