/**
 * Fuel Engine — custo real da deslocação, não só €/L.
 *
 * FuelStations → FuelPrices → FuelCards → DistanceCalculator →
 * CostCalculator → RecommendationEngine
 */

import { fuelService } from "@/lib/mobility/fuel";
import type { FuelType } from "@/lib/mobility/fuel/types";
import { navigationService } from "@/lib/navigation";
import { formatEUR } from "@/lib/money";
import { cacheGet, cacheSet, cacheKey } from "./cache";
import { assertJustified, buildRecommendation } from "./recommendation";
import type { EngineResult } from "./types";

export type FuelEngineInput = {
  utterance?: string;
  fuelType?: FuelType;
  budgetEuros?: number;
  /** L/100km — default gasolina urbana PT */
  consumptionLPer100km?: number;
  preferredBrands?: string[];
  preferredCards?: string[];
  lat?: number;
  lng?: number;
};

/** Preços do provider estão em milésimos de euro (1699 → 1,699 €/L). */
function litresToCents(litres: number, pricePerLitreMilli: number): number {
  return Math.round((litres * pricePerLitreMilli) / 10);
}

function formatEuroPerLitre(pricePerLitreMilli: number): string {
  return `${(pricePerLitreMilli / 1000).toFixed(3)}€/L`;
}

/** Custo verdadeiro = combustível do desvio + enchimento (vs baseline). */
function trueCostCents(opts: {
  pricePerLitreMilli: number;
  distanceKm: number;
  consumptionLPer100km: number;
  fillLitres: number;
}): { tripFuelCents: number; fillCents: number; totalCents: number; etaMin: number } {
  const tripLitres = (opts.distanceKm * 2 * opts.consumptionLPer100km) / 100; // ida+volta
  const tripFuelCents = litresToCents(tripLitres, opts.pricePerLitreMilli);
  const fillCents = litresToCents(opts.fillLitres, opts.pricePerLitreMilli);
  const etaMin = Math.max(1, Math.round(opts.distanceKm * 2.2));
  return {
    tripFuelCents,
    fillCents,
    totalCents: tripFuelCents + fillCents,
    etaMin,
  };
}

export async function recommendFuel(input: FuelEngineInput): Promise<EngineResult> {
  const fuelType = input.fuelType ?? "petrol";
  const consumption = input.consumptionLPer100km ?? 7.2;
  const key = cacheKey([
    "fuel",
    fuelType,
    input.budgetEuros,
    input.preferredBrands?.join(","),
  ]);
  type Cached = Awaited<ReturnType<typeof fuelService.recommend>>;
  let rec = cacheGet<Cached>(key);
  if (rec === null) {
    rec = await fuelService.recommend({
      fuelType,
      budgetEuros: input.budgetEuros,
      preferredBrands: input.preferredBrands,
      preferredCards: input.preferredCards,
      lat: input.lat,
      lng: input.lng,
    });
    cacheSet(key, rec, 45_000);
  }

  if (!rec) {
    return {
      ok: true,
      recommendation: buildRecommendation({
        engine: "fuel",
        bestLabel: "sem postos",
        opener: "Não encontrei postos adequados agora.",
        reason: "Tenta daqui a pouco — os preços mudam ao longo do dia.",
      }),
      recordImpact: false,
    };
  }

  const fillLitres =
    rec.fillLitres ??
    (input.budgetEuros != null
      ? (input.budgetEuros * 100) / (rec.station.pricePerLitreCents / 100)
      : 40);

  const candidates = [rec.station, ...rec.alternatives].map((s) => {
    const costs = trueCostCents({
      pricePerLitreMilli: s.pricePerLitreCents,
      distanceKm: s.distanceKm,
      consumptionLPer100km: consumption,
      fillLitres,
    });
    const cardBoost =
      input.preferredCards?.some((c) =>
        s.cardsAccepted.some((a) => a.toLowerCase() === c.toLowerCase()),
      )
        ? 1
        : 0;
    const brandBoost =
      input.preferredBrands?.some((b) => s.brand?.toLowerCase() === b.toLowerCase())
        ? 1
        : 0;
    // score: menor custo verdadeiro + proximidade + cartões
    const score =
      10_000 -
      costs.totalCents / 10 -
      s.distanceKm * 15 +
      cardBoost * 80 +
      brandBoost * 40;
    return {
      item: s,
      score,
      label: s.name,
      why: `${formatEuroPerLitre(s.pricePerLitreCents)} · ${s.distanceKm} km · custo real estimado ${formatEUR(costs.totalCents)}`,
      costs,
      etaMin: costs.etaMin,
    };
  });

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  const runnerUp = candidates[1];
  const nearest = [...candidates].sort((a, b) => a.item.distanceKm - b.item.distanceKm)[0];
  if (!best) {
    return {
      ok: true,
      recommendation: buildRecommendation({
        engine: "fuel",
        bestLabel: "sem opções",
        reason: "Sem postos para comparar.",
      }),
      recordImpact: false,
    };
  }

  const savingsVsNext =
    runnerUp != null
      ? Math.max(0, runnerUp.costs.totalCents - best.costs.totalCents)
      : 0;

  const detourMin = Math.max(0, best.etaMin - (nearest?.etaMin ?? best.etaMin));
  const opener =
    savingsVsNext >= 100 && detourMin > 0
      ? `Compensa fazer um desvio de cerca de ${detourMin} minutos até à ${best.label} porque irás poupar aproximadamente ${formatEUR(savingsVsNext)} no custo real (preço + deslocação).`
      : savingsVsNext >= 100
        ? `Recomendo a ${best.label} — poupas cerca de ${formatEUR(savingsVsNext)} no custo real face às outras opções.`
        : `Recomendo abastecer na ${best.label} — melhor equilíbrio entre preço, distância e o teu perfil.`;

  const cardBit =
    input.preferredCards?.length &&
    best.item.cardsAccepted.some((a) =>
      input.preferredCards!.some((c) => c.toLowerCase() === a.toLowerCase()),
    )
      ? ` Aceita o teu cartão de desconto.`
      : "";

  const nav = navigationService.open({
    label: best.item.name,
    lat: best.item.lat,
    lng: best.item.lng,
    address: best.item.address,
  });

  const reply = assertJustified(
    `${opener}${cardBit} ${best.why}.${
      input.budgetEuros != null
        ? ` Com ${input.budgetEuros}€ enches cerca de ${Math.round(fillLitres * 10) / 10} L.`
        : ""
    }`,
  );

  return {
    ok: true,
    recommendation: {
      engine: "fuel",
      headline: best.label,
      reason: best.why + cardBit,
      reply,
      savingsCents: savingsVsNext > 0 ? savingsVsNext : undefined,
      timeMinutesSaved: undefined,
      deepLink: nav.deepLink,
      alternativesCount: Math.max(0, candidates.length - 1),
      data: { station: best.item, trueCost: best.costs },
    },
    recordImpact: savingsVsNext > 0,
  };
}

export const fuelEngine = { recommendFuel };
