/** Helpers de convite seguros para client + server (sem Node crypto). */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeInviteEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email) || email.length > 254) return null;
  return email;
}

/** Mascara email para feedback UI: jo***@email.pt */
export function maskEmail(email: string): string {
  const [local, domain] = email.toLowerCase().split("@");
  if (!local || !domain) return "***";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}
