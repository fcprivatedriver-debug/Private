/**
 * Saving Engine — cérebro financeiro da Nina.
 * Agrega impacto de Shopping, Fuel, EV e Finance.
 */

import { prisma } from "@/lib/db";
import { formatEUR } from "@/lib/money";
import { startOfDay, startOfWeek, startOfMonth, startOfYear, subDays } from "date-fns";
import type { ImpactCategory, EngineRecommendation } from "./types";
import { buildRecommendation } from "./recommendation";

export type ImpactInput = {
  familyId: string;
  userId?: string | null;
  category: ImpactCategory;
  sourceEngine: string;
  amountCents: number;
  timeMinutes?: number;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  followed?: boolean;
};

export type SavingsBreakdown = {
  shoppingCents: number;
  fuelCents: number;
  evCents: number;
  financeCents: number;
  organizationCents: number;
  timeMinutes: number;
  totalCents: number;
};

export type SavingsPeriods = {
  daily: SavingsBreakdown;
  weekly: SavingsBreakdown;
  monthly: SavingsBreakdown;
  yearly: SavingsBreakdown;
};

function emptyBreakdown(): SavingsBreakdown {
  return {
    shoppingCents: 0,
    fuelCents: 0,
    evCents: 0,
    financeCents: 0,
    organizationCents: 0,
    timeMinutes: 0,
    totalCents: 0,
  };
}

function accumulate(
  rows: {
    category: string;
    amountCents: number;
    timeMinutes: number;
  }[],
): SavingsBreakdown {
  const b = emptyBreakdown();
  for (const r of rows) {
    b.totalCents += r.amountCents;
    b.timeMinutes += r.timeMinutes;
    if (r.category === "shopping") b.shoppingCents += r.amountCents;
    else if (r.category === "fuel") b.fuelCents += r.amountCents;
    else if (r.category === "ev") b.evCents += r.amountCents;
    else if (r.category === "finance") b.financeCents += r.amountCents;
    else if (r.category === "organization" || r.category === "time") {
      b.organizationCents += r.amountCents;
    }
  }
  return b;
}

/** Regista poupança quando o utilizador segue (ou aceita) uma recomendação. */
export async function recordImpact(input: ImpactInput) {
  if (input.amountCents <= 0 && !(input.timeMinutes && input.timeMinutes > 0)) {
    return null;
  }
  try {
    return await prisma.ninaImpact.create({
      data: {
        familyId: input.familyId,
        userId: input.userId ?? null,
        category: input.category,
        sourceEngine: input.sourceEngine,
        amountCents: Math.max(0, Math.round(input.amountCents)),
        timeMinutes: input.timeMinutes ?? 0,
        title: input.title.slice(0, 180),
        body: input.body?.slice(0, 2000),
        dataJson: input.data ? JSON.stringify(input.data) : null,
        followed: input.followed ?? true,
      },
    });
  } catch {
    // Schema ainda não migrado em algum ambiente — falha silenciosa
    return null;
  }
}

export async function recordFromRecommendation(
  familyId: string,
  userId: string | null | undefined,
  rec: EngineRecommendation,
  followed = true,
) {
  if (!rec.savingsCents && !rec.timeMinutesSaved) return null;
  const category: ImpactCategory =
    rec.engine === "shopping"
      ? "shopping"
      : rec.engine === "fuel"
        ? "fuel"
        : rec.engine === "ev"
          ? "ev"
          : rec.engine === "finance"
            ? "finance"
            : "organization";
  return recordImpact({
    familyId,
    userId,
    category,
    sourceEngine: rec.engine,
    amountCents: rec.savingsCents ?? 0,
    timeMinutes: rec.timeMinutesSaved ?? 0,
    title: rec.headline,
    body: rec.reason,
    data: rec.data,
    followed,
  });
}

export async function getSavingsPeriods(familyId: string): Promise<SavingsPeriods> {
  const now = new Date();
  const bounds = {
    daily: startOfDay(now),
    weekly: startOfWeek(now, { weekStartsOn: 1 }),
    monthly: startOfMonth(now),
    yearly: startOfYear(now),
  };

  try {
    const rows = await prisma.ninaImpact.findMany({
      where: {
        familyId,
        followed: true,
        createdAt: { gte: bounds.yearly },
      },
      select: {
        category: true,
        amountCents: true,
        timeMinutes: true,
        createdAt: true,
      },
    });

    const filterFrom = (from: Date) =>
      rows.filter((r) => r.createdAt >= from).map((r) => ({
        category: r.category,
        amountCents: r.amountCents,
        timeMinutes: r.timeMinutes,
      }));

    return {
      daily: accumulate(filterFrom(bounds.daily)),
      weekly: accumulate(filterFrom(bounds.weekly)),
      monthly: accumulate(filterFrom(bounds.monthly)),
      yearly: accumulate(filterFrom(bounds.yearly)),
    };
  } catch {
    return {
      daily: emptyBreakdown(),
      weekly: emptyBreakdown(),
      monthly: emptyBreakdown(),
      yearly: emptyBreakdown(),
    };
  }
}

export async function savingsSummaryReply(familyId: string): Promise<{
  reply: string;
  periods: SavingsPeriods;
}> {
  const periods = await getSavingsPeriods(familyId);
  const m = periods.monthly;
  const parts: string[] = [];

  if (m.totalCents <= 0 && m.timeMinutes <= 0) {
    parts.push(
      "Ainda não registei poupanças este mês — cada vez que seguires uma recomendação da Nina (compras, combustível ou carregamento), conto aqui.",
    );
  } else {
    parts.push(
      `Graças à Nina já poupaste aproximadamente ${formatEUR(m.totalCents)} este mês.`,
    );
    const cats: string[] = [];
    if (m.shoppingCents > 0) cats.push(`compras ${formatEUR(m.shoppingCents)}`);
    if (m.fuelCents > 0) cats.push(`combustível ${formatEUR(m.fuelCents)}`);
    if (m.evCents > 0) cats.push(`carregamentos ${formatEUR(m.evCents)}`);
    if (m.financeCents > 0) cats.push(`finanças ${formatEUR(m.financeCents)}`);
    if (cats.length) parts.push(`Por categoria: ${cats.join(", ")}.`);
    if (m.timeMinutes > 0) {
      parts.push(`Também poupaste cerca de ${m.timeMinutes} minutos em decisões.`);
    }
  }

  if (periods.weekly.totalCents > 0) {
    parts.push(`Esta semana: ${formatEUR(periods.weekly.totalCents)}.`);
  }

  return { reply: parts.join(" "), periods };
}

/** Insight curto para o Today screen (sem novo ecrã). */
export async function todaySavingsWhisper(familyId: string): Promise<string | null> {
  const { periods } = await savingsSummaryReply(familyId);
  if (periods.monthly.totalCents < 100) return null;
  return `Graças à Nina já poupaste aproximadamente ${formatEUR(periods.monthly.totalCents)} este mês.`;
}

/** Finance tip: como gastar menos — heurística, sem LLM. */
export async function spendLessAdvice(familyId: string, memberId?: string) {
  const monthStart = startOfMonth(new Date());
  const prevStart = startOfMonth(subDays(monthStart, 1));
  const expenses = await prisma.expense.findMany({
    where: {
      familyId,
      date: { gte: prevStart },
      ...(memberId ? { memberId } : {}),
    },
    include: { category: true },
    take: 200,
  });

  const thisMonth = expenses.filter((e) => e.date >= monthStart);
  const byCat = new Map<string, number>();
  for (const e of thisMonth) {
    const name = e.category?.name ?? "Outros";
    byCat.set(name, (byCat.get(name) ?? 0) + e.amountCents);
  }
  const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];

  const periods = await getSavingsPeriods(familyId);
  let reply: string;
  if (top) {
    reply = `Para gastar menos este mês, o maior peso está em «${top[0]}» (${formatEUR(top[1])}). Sugiro: (1) falar comigo antes de compras grandes, (2) dizer «vou às compras» para comparar supermercados, (3) «onde abasteço?» antes de encher o depósito.`;
  } else {
    reply =
      "Ainda há poucos movimentos este mês. O caminho mais simples: regista despesas por voz e pergunta «vou às compras» ou «onde abasteço?» — eu mostro onde poupas.";
  }
  if (periods.monthly.totalCents > 0) {
    reply += ` Já vais com ${formatEUR(periods.monthly.totalCents)} poupados via recomendações Nina.`;
  }

  return {
    ok: true as const,
    recommendation: buildRecommendation({
      engine: "finance",
      bestLabel: top?.[0] ?? "hábitos",
      opener: reply,
      reason: "Priorizei a categoria com maior peso e acções de poupança imediata.",
      savingsCents: undefined,
    }),
  };
}

export const savingEngine = {
  recordImpact,
  recordFromRecommendation,
  getSavingsPeriods,
  savingsSummaryReply,
  todaySavingsWhisper,
  spendLessAdvice,
};
