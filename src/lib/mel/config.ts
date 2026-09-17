/**
 * Configuração central da MEL / OpenAI.
 * Nomes de modelo só aqui (ou via env) — nunca espalhar hardcoded.
 */

export const MEL_CONFIG = {
  /** Modelo económico padrão — override com OPENAI_MODEL */
  defaultModel: "gpt-4o-mini",
  maxOutputTokens: 450,
  maxUserMessageChars: 1_200,
  maxHistoryTurns: 6,
  maxToolRounds: 4,
  requestTimeoutMs: 25_000,
  /** Limite mensal por utilizador (preparação para planos Stripe) */
  defaultMonthlyLimit: 200,
  temperature: 0.35,
} as const;

export function resolveMelModel(): string {
  const fromEnv = process.env.OPENAI_MODEL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : MEL_CONFIG.defaultModel;
}

export function resolveMelMonthlyLimit(): number {
  const n = Number(process.env.MEL_MONTHLY_LIMIT);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  return MEL_CONFIG.defaultMonthlyLimit;
}

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}
