/**
 * EV Engine — melhor decisão de carregamento (não só o mais barato).
 *
 * BatteryPrediction → Chargers → Availability → ChargingSpeed →
 * ChargingPrice → WaitingTime → RecommendationEngine
 */

import { evService } from "@/lib/mobility/ev";
import { navigationService } from "@/lib/navigation";
import { formatEUR } from "@/lib/money";
import { cacheGet, cacheSet, cacheKey } from "./cache";
import { assertJustified, buildRecommendation } from "./recommendation";
import type { EngineResult } from "./types";

export type EvEngineInput = {
  batteryPercent: number;
  targetPercent?: number;
  batteryKwh?: number;
  preferredNetworks?: string[];
  preferredCards?: string[];
  /** minutos de espera estimados por rede (provider futuro) */
  waitingByNetwork?: Record<string, number>;
  lat?: number;
  lng?: number;
};

export function predictRangeKm(batteryPercent: number, usableKwh = 55, whPerKm = 160): number {
  const kwh = (batteryPercent / 100) * usableKwh;
  return Math.round((kwh * 1000) / whPerKm);
}

export async function recommendCharge(input: EvEngineInput): Promise<EngineResult> {
  const target = input.targetPercent ?? 80;
  const battery = input.batteryPercent;

  if (battery >= target) {
    return {
      ok: true,
      recommendation: buildRecommendation({
        engine: "ev",
        bestLabel: "sem necessidade",
        opener: `Com ${battery}% de bateria não precisas de carregar já.`,
        reason: `Estás no ou acima do alvo de ${target}%. Queres mesmo assim um ponto próximo?`,
      }),
      recordImpact: false,
    };
  }

  const rangeKm = predictRangeKm(battery, input.batteryKwh ?? 55);
  const key = cacheKey(["ev", battery, target, input.preferredNetworks?.join(",")]);
  type Cached = Awaited<ReturnType<typeof evService.recommend>>;
  let base = cacheGet<Cached>(key);
  if (base === null) {
    base = await evService.recommend({
      batteryPercent: battery,
      targetPercent: target,
      batteryKwh: input.batteryKwh,
      preferredNetworks: input.preferredNetworks,
      preferredCards: input.preferredCards,
      lat: input.lat,
      lng: input.lng,
    });
    cacheSet(key, base, 45_000);
  }

  if (!base) {
    return {
      ok: true,
      recommendation: buildRecommendation({
        engine: "ev",
        bestLabel: "sem carregadores",
        opener: "Não encontrei carregadores adequados agora.",
        reason: "Tenta outra localização ou daqui a pouco.",
      }),
      recordImpact: false,
    };
  }

  const stations = [base.station, ...base.alternatives];
  const energyKwh = base.energyKwh;

  const scored = stations.map((s) => {
    const chargeMinutes = Math.max(5, Math.round((energyKwh / Math.max(s.powerKw, 1)) * 60));
    const etaMinutes = Math.round(s.distanceKm * 2.2);
    const wait = input.waitingByNetwork?.[s.network] ?? (s.powerKw >= 150 ? 5 : 0);
    const cost = Math.round(energyKwh * s.pricePerKwhCents);
    const totalTime = etaMinutes + chargeMinutes + wait;
    let score = 800 - cost / 8 - totalTime * 1.2 - s.distanceKm * 12;
    if (input.preferredNetworks?.some((n) => s.network.toLowerCase().includes(n.toLowerCase()))) {
      score += 60;
    }
    if (s.powerKw >= 100) score += 35;
    return {
      item: s,
      score,
      label: s.name,
      savingsCents: 0,
      timeMinutes: totalTime,
      why: `Chegas em ~${etaMinutes} min · ~${chargeMinutes} min até ${target}% · ~${formatEUR(cost)}${
        wait ? ` · espera ~${wait} min` : ""
      }`,
      cost,
      chargeMinutes,
      etaMinutes,
      wait,
      totalTime,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  const next = scored[1];
  if (!best) {
    return {
      ok: true,
      recommendation: buildRecommendation({
        engine: "ev",
        bestLabel: "sem opções",
        reason: "Sem carregadores para comparar.",
      }),
      recordImpact: false,
    };
  }

  const savingsVsNext =
    next != null ? Math.max(0, next.cost - best.cost) : 0;
  const timeGain =
    next != null ? Math.max(0, next.totalTime - best.totalTime) : 0;

  const opener = `Recomendo o ${best.label}. Chegas em cerca de ${best.etaMinutes} minutos. Cerca de ${best.chargeMinutes} minutos até aos ${target}%. Custo estimado ${formatEUR(best.cost)}.`;

  const whyExtra =
    timeGain > 0 || savingsVsNext > 0
      ? ` É a melhor opção face às alternativas${
          savingsVsNext > 0 ? ` (poupas ~${formatEUR(savingsVsNext)}` : ""
        }${timeGain > 0 ? `${savingsVsNext > 0 ? " e " : " ("}~${timeGain} min` : ""}${
          savingsVsNext > 0 || timeGain > 0 ? ")" : ""
        }.`
      : " É a melhor opção para continuares o teu dia.";

  const nav = navigationService.open({
    label: best.item.name,
    lat: best.item.lat,
    lng: best.item.lng,
    address: best.item.address,
  });

  const reply = assertJustified(
    `${opener}${whyExtra} Autonomia actual estimada ~${rangeKm} km.`,
  );

  return {
    ok: true,
    recommendation: {
      engine: "ev",
      headline: best.label,
      reason: best.why + whyExtra,
      reply,
      savingsCents: savingsVsNext > 0 ? savingsVsNext : undefined,
      timeMinutesSaved: timeGain > 0 ? timeGain : undefined,
      deepLink: nav.deepLink,
      alternativesCount: Math.max(0, scored.length - 1),
      data: {
        station: best.item,
        batteryPercent: battery,
        rangeKm,
        targetPercent: target,
      },
    },
    recordImpact: savingsVsNext > 0 || timeGain > 0,
  };
}

export const evEngine = { recommendCharge, predictRangeKm };
