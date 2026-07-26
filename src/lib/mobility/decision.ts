/**
 * Smart Decision Engine (compat) — delega nos Fuel/EV Engines V3.
 * Mantido para não partir callers; a Intelligence Layer é o caminho preferido.
 */
import { fuelEngine } from "@/lib/engines/fuel-engine";
import { evEngine } from "@/lib/engines/ev-engine";
import type { FuelType } from "@/lib/mobility/fuel/types";

export type MobilityDecisionInput = {
  kind: "fuel" | "ev" | "auto";
  utterance: string;
  batteryPercent?: number;
  fuelType?: FuelType;
  budgetEuros?: number;
  preferredFuelBrands?: string[];
  preferredEvNetworks?: string[];
};

export type MobilityDecision = {
  reply: string;
  deepLink?: string;
  kind: "fuel" | "ev";
};

function detectFuelType(n: string): FuelType {
  if (/diesel|gasoleo|gasóleo/.test(n)) return "diesel";
  if (/gpl|lpg/.test(n)) return "lpg";
  return "petrol";
}

function extractBudget(n: string): number | undefined {
  const m = n.match(/(\d+(?:[.,]\d+)?)\s*€/);
  if (!m) return undefined;
  return Number(m[1].replace(",", "."));
}

function extractBattery(n: string): number | undefined {
  const m = n.match(/(\d+)\s*%/) || n.match(/(\d+)\s*(?:de\s+)?bateria/);
  if (!m) return undefined;
  return Number(m[1]);
}

export async function decideMobility(input: MobilityDecisionInput): Promise<MobilityDecision> {
  const n = input.utterance
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const wantsEv =
    input.kind === "ev" ||
    /bateria|carregar|carregamento|supercharger|eletrico|elétrico|ev\b/.test(n);

  if (wantsEv || (input.kind === "auto" && /bateria|carregar/.test(n))) {
    const battery = input.batteryPercent ?? extractBattery(n) ?? 30;
    const result = await evEngine.recommendCharge({
      batteryPercent: battery,
      preferredNetworks: input.preferredEvNetworks,
    });
    return {
      kind: "ev",
      reply: result.recommendation.reply,
      deepLink: result.recommendation.deepLink,
    };
  }

  const result = await fuelEngine.recommendFuel({
    utterance: input.utterance,
    fuelType: input.fuelType ?? detectFuelType(n),
    budgetEuros: input.budgetEuros ?? extractBudget(n),
    preferredBrands: input.preferredFuelBrands,
  });
  return {
    kind: "fuel",
    reply: result.recommendation.reply,
    deepLink: result.recommendation.deepLink,
  };
}
