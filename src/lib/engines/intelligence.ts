/**
 * Intelligence Layer — decide automaticamente qual Engine usar.
 * O utilizador nunca escolhe módulos.
 *
 * Missão: cada resposta deve ajudar a poupar dinheiro, tempo,
 * simplificar a vida ou tomar uma melhor decisão.
 */

import { parseMoneyIntent, type ParsedMoneyIntent } from "@/lib/ai/parse-intent";
import { shoppingEngine } from "./shopping-engine";
import { fuelEngine } from "./fuel-engine";
import { evEngine } from "./ev-engine";
import { savingEngine } from "./saving-engine";
import { learningEngine } from "./learning-engine";
import { assertJustified } from "./recommendation";
import type { EngineId, EngineResult } from "./types";
import type { FuelType } from "@/lib/mobility/fuel/types";

export type IntelligenceContext = {
  familyId: string;
  userId: string;
  memberId?: string;
  utterance: string;
  shoppingItems?: { name: string; brand?: string | null; quantity?: string | null }[];
};

export type IntelligenceOutcome = {
  engine: EngineId;
  reply: string;
  deepLink?: string;
  suggestions?: string[];
  recordImpact?: boolean;
  savingsCents?: number;
  /** Intent original (para o caller continuar fluxos de finanças/calendar etc.) */
  intent: ParsedMoneyIntent;
  /** Se true, o caller deve tratar o intent clássico (expense, calendar, …) */
  passthrough: boolean;
  engineResult?: EngineResult;
};

function detectFuelType(n: string): FuelType {
  if (/diesel|gasoleo|gasóleo/.test(n)) return "diesel";
  if (/gpl|lpg/.test(n)) return "lpg";
  return "petrol";
}

/**
 * Ponto de entrada: interpreta e encaminha para o engine certo.
 * Regras simples primeiro — IA/LLM só quando o caller precisar (passthrough).
 */
export async function runIntelligence(
  ctx: IntelligenceContext,
): Promise<IntelligenceOutcome> {
  const intent = parseMoneyIntent(ctx.utterance);
  const n = ctx.utterance
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // ——— Saving Engine ———
  if (
    intent?.kind === "savings_query" ||
    /(quanto poupei|quanto poupamos|poupanca da nina|poupança da nina|graças à nina|gracas a nina)/.test(
      n,
    )
  ) {
    const { reply } = await savingEngine.savingsSummaryReply(ctx.familyId);
    return {
      engine: "saving",
      reply: assertJustified(reply),
      intent,
      passthrough: false,
      suggestions: ["Vou às compras", "Onde abasteço?", "Como posso gastar menos este mês?"],
    };
  }

  if (
    intent?.kind === "spend_less" ||
    /(como (posso |posso )?gastar menos|reduzir despesas|poupar (mais )?este mes|poupar (mais )?este mês)/.test(
      n,
    )
  ) {
    const advice = await savingEngine.spendLessAdvice(ctx.familyId, ctx.memberId);
    return {
      engine: "finance",
      reply: assertJustified(advice.recommendation.reply),
      intent,
      passthrough: false,
      suggestions: ["Vou às compras", "Onde abasteço?", "Quanto poupei?"],
      engineResult: advice,
    };
  }

  // ——— Shopping Engine ———
  if (intent?.kind === "shopping_trip") {
    const items = ctx.shoppingItems ?? [];
    const result = await shoppingEngine.optimizeBasket(items);
    if (result.recommendation.headline && result.recommendation.headline !== "lista vazia") {
      await learningEngine.learn({
        type: "shopping_store",
        familyId: ctx.familyId,
        userId: ctx.userId,
        storeName: result.recommendation.headline,
      });
    }
    await learningEngine.learn({
      type: "habit_hour",
      familyId: ctx.familyId,
      userId: ctx.userId,
      key: "shopping",
    });
    return {
      engine: "shopping",
      reply: result.recommendation.reply,
      intent,
      passthrough: false,
      recordImpact: result.recordImpact,
      savingsCents: result.recommendation.savingsCents,
      suggestions: ["Adiciona leite Mimosa", "Quanto poupei?", "Onde abasteço?"],
      engineResult: result,
    };
  }

  // ——— EV Engine ———
  if (intent?.kind === "mobility" && intent.mode === "ev") {
    const prefs = await learningEngine.getMobilityPrefs(ctx.familyId, ctx.userId);
    const result = await evEngine.recommendCharge({
      batteryPercent: intent.batteryPercent ?? prefs.typicalBatteryPct ?? 30,
      preferredNetworks: prefs.evNetwork ? [prefs.evNetwork] : undefined,
    });
    const network =
      result.recommendation.data &&
      typeof result.recommendation.data === "object" &&
      "station" in result.recommendation.data
        ? (result.recommendation.data.station as { network?: string })?.network
        : undefined;
    await learningEngine.learn({
      type: "ev_charger",
      familyId: ctx.familyId,
      userId: ctx.userId,
      network: network ?? null,
      batteryPct: intent.batteryPercent,
    });
    return {
      engine: "ev",
      reply: result.recommendation.reply,
      deepLink: result.recommendation.deepLink,
      intent,
      passthrough: false,
      recordImpact: result.recordImpact,
      savingsCents: result.recommendation.savingsCents,
      suggestions: ["Leva-me ao carregador", "Quanto poupei?", "O que importa hoje?"],
      engineResult: result,
    };
  }

  // ——— Fuel Engine ———
  if (intent?.kind === "mobility" && (intent.mode === "fuel" || intent.mode === "auto")) {
    const prefs = await learningEngine.getMobilityPrefs(ctx.familyId, ctx.userId);
    const result = await fuelEngine.recommendFuel({
      utterance: intent.utterance,
      fuelType: detectFuelType(n),
      budgetEuros: intent.budgetEuros,
      preferredBrands: prefs.fuelBrand ? [prefs.fuelBrand] : undefined,
    });
    const brand =
      result.recommendation.data &&
      typeof result.recommendation.data === "object" &&
      "station" in result.recommendation.data
        ? (result.recommendation.data.station as { brand?: string })?.brand
        : undefined;
    await learningEngine.learn({
      type: "fuel_station",
      familyId: ctx.familyId,
      userId: ctx.userId,
      brand: brand ?? null,
      stationName: result.recommendation.headline,
    });
    return {
      engine: "fuel",
      reply: result.recommendation.reply,
      deepLink: result.recommendation.deepLink,
      intent,
      passthrough: false,
      recordImpact: result.recordImpact,
      savingsCents: result.recommendation.savingsCents,
      suggestions: ["Leva-me ao posto mais barato", "Quanto poupei?", "Tenho 30% de bateria"],
      engineResult: result,
    };
  }

  // ——— EV explícito mesmo se mode auto falhou ———
  if (intent?.kind === "mobility" && intent.mode === "auto") {
    // already handled as fuel above
  }

  // Pass-through: calendar, reminder, navigate, shopping_add, finance, today, etc.
  return {
    engine: "learning",
    reply: "",
    intent,
    passthrough: true,
  };
}

export const intelligenceLayer = { runIntelligence };
