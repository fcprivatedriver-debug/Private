import { z } from "zod";

/** Mín. 8 chars, 1 maiúscula, 1 número, 1 símbolo */
export const passwordRules = z
  .string()
  .min(8, "A palavra-passe precisa de pelo menos 8 caracteres")
  .regex(/[A-Z]/, "Inclui pelo menos uma letra maiúscula")
  .regex(/[0-9]/, "Inclui pelo menos um número")
  .regex(/[^A-Za-z0-9]/, "Inclui pelo menos um símbolo (ex.: ! @ #)");

export function validatePassword(password: string): { ok: true } | { ok: false; error: string } {
  const r = passwordRules.safeParse(password);
  if (r.success) return { ok: true };
  return { ok: false, error: r.error.issues[0]?.message || "Palavra-passe inválida" };
}

export const PASSWORD_HINT =
  "Mínimo 8 caracteres, com maiúscula, número e símbolo (ex.: Nina2026!).";
