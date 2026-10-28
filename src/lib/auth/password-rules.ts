import { z } from "zod";

/** Mín. 8 chars, 1 maiúscula, 1 número, 1 símbolo */
export const PASSWORD_CHECKS = [
  {
    id: "length",
    label: "Pelo menos 8 caracteres",
    test: (password: string) => password.length >= 8,
  },
  {
    id: "upper",
    label: "Uma letra maiúscula",
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    id: "digit",
    label: "Um número",
    test: (password: string) => /[0-9]/.test(password),
  },
  {
    id: "symbol",
    label: "Um símbolo (ex.: ! @ #)",
    test: (password: string) => /[^A-Za-z0-9]/.test(password),
  },
] as const;

export const passwordRules = z
  .string()
  .min(8, "A palavra-passe precisa de pelo menos 8 caracteres")
  .regex(/[A-Z]/, "Inclui pelo menos uma letra maiúscula")
  .regex(/[0-9]/, "Inclui pelo menos um número")
  .regex(/[^A-Za-z0-9]/, "Inclui pelo menos um símbolo (ex.: ! @ #)");

export function passwordCheckState(password: string) {
  return PASSWORD_CHECKS.map((rule) => ({
    id: rule.id,
    label: rule.label,
    met: rule.test(password),
  }));
}

export function validatePassword(password: string): { ok: true } | { ok: false; error: string } {
  const r = passwordRules.safeParse(password);
  if (r.success) return { ok: true };
  return { ok: false, error: r.error.issues[0]?.message || "Palavra-passe inválida" };
}

export const PASSWORD_HINT =
  "Mínimo 8 caracteres, com maiúscula, número e símbolo (ex.: Exemplo2026!).";
