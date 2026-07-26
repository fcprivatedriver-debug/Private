/**
 * Recommendation Engine — escolhe UMA melhor opção e justifica sempre.
 * Nunca devolve listas cruas ao utilizador.
 */

import { formatEUR } from "@/lib/money";
import type { EngineId, EngineRecommendation } from "./types";

export type ScoredOption<T> = {
  item: T;
  score: number;
  label: string;
  savingsCents?: number;
  timeMinutes?: number;
  why: string;
};

export function pickBest<T>(
  options: ScoredOption<T>[],
  engine: EngineId,
): { best: ScoredOption<T>; rest: ScoredOption<T>[] } | null {
  if (options.length === 0) return null;
  const sorted = [...options].sort((a, b) => b.score - a.score);
  return { best: sorted[0], rest: sorted.slice(1) };
}

export function buildRecommendation(opts: {
  engine: EngineId;
  bestLabel: string;
  reason: string;
  savingsCents?: number;
  timeMinutesSaved?: number;
  deepLink?: string;
  alternativesCount?: number;
  /** Frase de abertura específica do domínio */
  opener?: string;
  data?: Record<string, unknown>;
}): EngineRecommendation {
  const parts: string[] = [];
  if (opts.opener) parts.push(opts.opener);
  else parts.push(`Recomendo ${opts.bestLabel}.`);
  parts.push(opts.reason);
  if (opts.savingsCents != null && opts.savingsCents > 0) {
    parts.push(`Poupança estimada: ${formatEUR(opts.savingsCents)}.`);
  }
  if (opts.timeMinutesSaved != null && opts.timeMinutesSaved > 0) {
    parts.push(`Ganhas cerca de ${opts.timeMinutesSaved} minutos.`);
  }

  return {
    engine: opts.engine,
    headline: opts.bestLabel,
    reason: opts.reason,
    reply: parts.join(" ").replace(/\s+/g, " ").trim(),
    savingsCents: opts.savingsCents,
    timeMinutesSaved: opts.timeMinutesSaved,
    deepLink: opts.deepLink,
    alternativesCount: opts.alternativesCount,
    data: opts.data,
  };
}

/** Garante que a resposta explica o «porquê» — nunca só um preço. */
export function assertJustified(reply: string): string {
  const hasWhy =
    /porque|compensa|recomendo|melhor|poupa|poupagem|relativamente|fica|minuto/i.test(
      reply,
    );
  if (hasWhy) return reply;
  return `${reply} Escolhi esta opção por ser o melhor equilíbrio entre custo, tempo e hábitos.`;
}
