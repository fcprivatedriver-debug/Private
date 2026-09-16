import { prisma } from "@/lib/db";
import { resolveMelMonthlyLimit } from "./config";

/**
 * Rate limit simples por utilizador (mês civil UTC).
 * Preparado para limites por plano Stripe no futuro (resolver limite via subscription).
 */
export async function checkMelRateLimit(userId: string): Promise<
  | { ok: true; remaining: number; limit: number }
  | { ok: false; reason: "limit"; limit: number; used: number }
> {
  const limit = resolveMelMonthlyLimit();
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);

  const used = await prisma.melUsage.count({
    where: {
      userId,
      createdAt: { gte: start },
      success: true,
    },
  });

  if (used >= limit) {
    return { ok: false, reason: "limit", limit, used };
  }
  return { ok: true, remaining: limit - used, limit };
}

/**
 * Estimativa de custo em micros de USD (1 USD = 1_000_000 micros).
 * Preços aproximados gpt-4o-mini; outros modelos usam a mesma heurística conservadora.
 * Não substitui facturação real da OpenAI.
 */
export function estimateCostMicros(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  // gpt-4o-mini ~ $0.15 / 1M input, $0.60 / 1M output
  let inPerM = 0.15;
  let outPerM = 0.6;
  const m = model.toLowerCase();
  if (m.includes("gpt-4o") && !m.includes("mini")) {
    inPerM = 2.5;
    outPerM = 10;
  } else if (m.includes("o3") || m.includes("o1")) {
    inPerM = 1.1;
    outPerM = 4.4;
  }
  const usd = (promptTokens / 1_000_000) * inPerM + (completionTokens / 1_000_000) * outPerM;
  return Math.max(0, Math.round(usd * 1_000_000));
}

export async function logMelUsage(opts: {
  userId: string;
  familyId?: string | null;
  model: string;
  promptTokens: number;
  completionTokens: number;
  estimatedCostMicros?: number | null;
  success: boolean;
  errorCode?: string | null;
}) {
  try {
    await prisma.melUsage.create({
      data: {
        userId: opts.userId,
        familyId: opts.familyId ?? null,
        model: opts.model,
        promptTokens: opts.promptTokens,
        completionTokens: opts.completionTokens,
        estimatedCostMicros:
          opts.estimatedCostMicros ??
          estimateCostMicros(opts.model, opts.promptTokens, opts.completionTokens),
        success: opts.success,
        errorCode: opts.errorCode ?? null,
      },
    });
  } catch (err) {
    console.error("[mel] usage log failed", err);
  }
}
