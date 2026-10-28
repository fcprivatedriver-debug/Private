import type { FinanceScope } from "@prisma/client";

export type MovementScope = FinanceScope;

/**
 * Âmbito do movimento. Um valor desconhecido cai no âmbito de recurso
 * (espaço activo na criação, âmbito já gravado na edição).
 */
export function resolveMovementScope(input: {
  requested: string | null | undefined;
  fallback: MovementScope;
}): MovementScope {
  const value = String(input.requested || "").trim().toUpperCase();
  if (value === "PERSONAL" || value === "FAMILY") return value;
  return input.fallback;
}

/**
 * Pessoal: o membro é sempre o da sessão. Um memberId diferente é rejeitado.
 * Familiar: o membro tem de pertencer à família autenticada.
 */
export function resolveMovementMember(input: {
  scope: MovementScope;
  requestedMemberId: string | null | undefined;
  actorMemberId: string;
  familyMemberIds: readonly string[];
}): { ok: true; memberId: string } | { ok: false; error: string } {
  const requested = String(input.requestedMemberId || "").trim();
  const family = new Set(input.familyMemberIds);

  if (!input.actorMemberId || !family.has(input.actorMemberId)) {
    return { ok: false, error: "Sessão sem membro válido nesta família." };
  }

  if (input.scope === "PERSONAL") {
    if (requested && requested !== input.actorMemberId) {
      return {
        ok: false,
        error: "Não podes atribuir um movimento pessoal a outro membro.",
      };
    }
    return { ok: true, memberId: input.actorMemberId };
  }

  const memberId = requested || input.actorMemberId;
  if (!family.has(memberId)) {
    return { ok: false, error: "Esse membro não pertence à tua família." };
  }
  return { ok: true, memberId };
}

/** Movimentos pessoais só são visíveis ao membro a quem pertencem. */
export function canReadMovement(input: {
  scope: MovementScope;
  memberId: string | null | undefined;
  actorMemberId: string;
}): boolean {
  if (input.scope === "FAMILY") return true;
  return Boolean(input.memberId) && input.memberId === input.actorMemberId;
}
