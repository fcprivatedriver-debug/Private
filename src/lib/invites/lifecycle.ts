/** Resolução de estado do convite (mensagens UI) — testável sem BD. */

export type InviteLifecycleInput = {
  acceptedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
  inviteEmail: string | null;
  sessionEmail: string | null;
  now?: Date;
};

export type InviteLifecycleState =
  | { status: "ok" }
  | { status: "invalid" }
  | { status: "expired"; message: string }
  | { status: "used"; message: string }
  | { status: "revoked"; message: string }
  | { status: "wrong_email"; message: string };

export function resolveInviteLifecycle(
  invite: InviteLifecycleInput | null,
): InviteLifecycleState {
  if (!invite) return { status: "invalid" };
  const now = invite.now ?? new Date();
  if (invite.revokedAt) {
    return { status: "revoked", message: "Este convite já não é válido." };
  }
  if (invite.acceptedAt) {
    return { status: "used", message: "Este convite já foi utilizado." };
  }
  if (invite.expiresAt < now) {
    return { status: "expired", message: "Este convite expirou." };
  }
  if (
    invite.inviteEmail &&
    invite.sessionEmail &&
    invite.sessionEmail.toLowerCase() !== invite.inviteEmail.toLowerCase()
  ) {
    return {
      status: "wrong_email",
      message: "Este convite é para outro email. Termina a sessão e entra com a conta correcta.",
    };
  }
  return { status: "ok" };
}

/** Regras de negócio antes de criar convite (casos L/M/N). */
export function validateNewEmailInvite(opts: {
  emailRaw: string;
  alreadyMember: boolean;
  hasPendingDuplicate: boolean;
}): { ok: true; email: string } | { ok: false; error: string } {
  const email = opts.emailRaw.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Indica um email válido." };
  }
  if (opts.alreadyMember) {
    return { ok: false, error: "Este email já é membro desta Família." };
  }
  if (opts.hasPendingDuplicate) {
    return {
      ok: false,
      error: "Já existe um convite pendente para este email. Reenvia ou cancela o anterior.",
    };
  }
  return { ok: true, email };
}
