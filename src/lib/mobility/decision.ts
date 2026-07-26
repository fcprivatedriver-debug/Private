/**
 * Smart Decision Engine — mobilidade.
 * Não lista apenas postos: recomenda com contexto.
 */
import { fuelService } from "@/lib/mobility/fuel";
import type { FuelType } from "@/lib/mobility/fuel/types";
import { evService } from "@/lib/mobility/ev";
import { navigationService } from "@/lib/navigation";
import { formatEUR } from "@/lib/money";

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
  const wantsFuel =
    input.kind === "fuel" ||
    /abastec|combustivel|combustível|posto|gasolina|diesel|gasoleo/.test(n);

  if (wantsEv || (input.kind === "auto" && /bateria|carregar/.test(n))) {
    const battery = input.batteryPercent ?? extractBattery(n) ?? 30;
    const rec = await evService.recommend({
      batteryPercent: battery,
      targetPercent: 80,
      preferredNetworks: input.preferredEvNetworks,
    });
    if (!rec) {
      return {
        kind: "ev",
        reply: "Com a bateria atual não precisas de carregar já. Queres mesmo assim um ponto próximo?",
      };
    }
    const nav = navigationService.open({
      label: rec.station.name,
      lat: rec.station.lat,
      lng: rec.station.lng,
      address: rec.station.address,
    });
    return {
      kind: "ev",
      deepLink: nav.deepLink,
      reply: `Recomendo o ${rec.station.name}.\nChegas em cerca de ${rec.etaMinutes} minutos.\nCerca de ${rec.chargeMinutes} minutos até aos 80%.\nCusto estimado ${formatEUR(rec.estimatedCostCents)}.\nÉ a melhor opção para continuares o teu dia.`,
    };
  }

  if (wantsFuel || input.kind === "fuel" || input.kind === "auto") {
    const fuelType = input.fuelType ?? detectFuelType(n);
    const budget = input.budgetEuros ?? extractBudget(n);
    const rec = await fuelService.recommend({
      fuelType,
      budgetEuros: budget,
      preferredBrands: input.preferredFuelBrands,
    });
    if (!rec) {
      return { kind: "fuel", reply: "Não encontrei postos adequados agora. Tenta daqui a pouco." };
    }
    const nav = navigationService.open({
      label: rec.station.name,
      lat: rec.station.lat,
      lng: rec.station.lng,
      address: rec.station.address,
    });
    const litresBit =
      rec.fillLitres != null
        ? `\nCom ${budget}€ enches cerca de ${rec.fillLitres} L.`
        : "";
    return {
      kind: "fuel",
      deepLink: nav.deepLink,
      reply: `Recomendo ${rec.station.name} (${rec.station.distanceKm} km).\n${(rec.station.pricePerLitreCents / 100).toFixed(3)}€/L · estimativa ${formatEUR(rec.estimatedCostCents)}.${litresBit}\n${rec.reason}`,
    };
  }

  return {
    kind: "fuel",
    reply: "Queres combustível ou carregamento elétrico? Diz por exemplo «onde abasteço» ou «tenho 30% de bateria».",
  };
}
