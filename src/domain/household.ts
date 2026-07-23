import type { FamilyRole, HouseholdKind } from "@prisma/client";

export const HOUSEHOLD_KIND_LABELS: Record<HouseholdKind, string> = {
  INDIVIDUAL: "Conta individual",
  COUPLE: "Conta de casal",
  FAMILY: "Conta familiar",
  SHARED: "Conta partilhada",
};

export const HOUSEHOLD_KIND_HINTS: Record<HouseholdKind, string> = {
  INDIVIDUAL: "Só para ti — podes convidar alguém mais tarde.",
  COUPLE: "Para dois: partilham tudo e decidem juntos.",
  FAMILY: "Casal, filhos e familiares — uma só visão do dinheiro.",
  SHARED: "Amigos ou colegas com orçamento e objetivos comuns.",
};

/** Papéis amigáveis (UI) mapeados para FamilyRole */
export const PERMISSION_LABELS: Record<FamilyRole, string> = {
  OWNER: "Administrador",
  ADMIN: "Administrador",
  MEMBER: "Editor",
  VIEWER: "Apenas consulta",
};

export const PERMISSION_HINTS: Record<FamilyRole, string> = {
  OWNER: "Gere membros, permissões e a conta.",
  ADMIN: "Gere membros e permissões.",
  MEMBER: "Pode registar gastos e entradas.",
  VIEWER: "Vê tudo, mas não altera.",
};

export function canEditFinances(role: FamilyRole): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "MEMBER";
}

export function canManageMembers(role: FamilyRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function makeInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "NINA-";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
