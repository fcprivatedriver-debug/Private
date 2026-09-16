/**
 * Tokens de convite familiar — raw só no link; na BD fica o hash.
 */

import { createRawToken, hashToken } from "@/lib/auth/security";

export { maskEmail, normalizeInviteEmail } from "@/lib/invites/mask";

export const INVITE_TTL_DAYS = 14;
export const INVITE_RESEND_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutos

export function issueInviteToken(): { raw: string; hash: string } {
  const raw = createRawToken();
  return { raw, hash: hashToken(raw) };
}

export function hashInviteToken(raw: string): string {
  return hashToken(raw.trim());
}

export function inviteExpiryDate(days = INVITE_TTL_DAYS): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt;
}

export function canResendInvite(lastSentAt: Date | null | undefined, now = new Date()): boolean {
  if (!lastSentAt) return true;
  return now.getTime() - lastSentAt.getTime() >= INVITE_RESEND_COOLDOWN_MS;
}

export function resendCooldownSeconds(lastSentAt: Date, now = new Date()): number {
  const left = INVITE_RESEND_COOLDOWN_MS - (now.getTime() - lastSentAt.getTime());
  return Math.max(1, Math.ceil(left / 1000));
}
