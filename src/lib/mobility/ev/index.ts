import type { EvContext, EvRecommendation, EvService } from "./types";
import { prototypeChargingProvider } from "./providers/prototype";

export function createEvService(): EvService {
  const providers = [prototypeChargingProvider];

  return {
    meta: {
      id: "ev",
      label: "Carregamento EV",
      health: "prototype",
    },
    async recommend(ctx: EvContext): Promise<EvRecommendation | null> {
      const target = ctx.targetPercent ?? 80;
      const batteryKwh = ctx.batteryKwh ?? 60;
      const needPct = Math.max(0, target - ctx.batteryPercent);
      if (needPct <= 0) return null;

      const all = (await Promise.all(providers.map((p) => p.search(ctx)))).flat();
      if (all.length === 0) return null;

      const energyKwh = (needPct / 100) * batteryKwh;

      const scored = all.map((s) => {
        const chargeMinutes = Math.max(5, Math.round((energyKwh / Math.max(s.powerKw, 1)) * 60));
        const etaMinutes = Math.round(s.distanceKm * 2.2); // ~traffic-ish
        const cost = Math.round(energyKwh * s.pricePerKwhCents);
        let score = 500 - cost / 5 - chargeMinutes - etaMinutes * 1.5 - s.distanceKm * 10;
        if (ctx.preferredNetworks?.some((n) => s.network.toLowerCase().includes(n.toLowerCase()))) {
          score += 50;
        }
        if (s.powerKw >= 100) score += 30;
        return { s, score, chargeMinutes, etaMinutes, cost };
      });
      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];

      return {
        station: best.s,
        chargeMinutes: best.chargeMinutes,
        energyKwh: Math.round(energyKwh * 10) / 10,
        estimatedCostCents: best.cost,
        etaMinutes: best.etaMinutes,
        reason: `Chegas em ~${best.etaMinutes} min · ~${best.chargeMinutes} min até ${target}% · melhor equilíbrio tempo/custo.`,
        alternatives: scored.slice(1, 3).map((x) => x.s),
      };
    },
  };
}

export const evService = createEvService();
