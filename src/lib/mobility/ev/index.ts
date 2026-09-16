import type { EvContext, EvRecommendation, EvService } from "./types";
import { mobieChargingProvider, MOBIE_PROVIDER_STATUS } from "./providers/mobie";

export function createEvService(): EvService {
  const providers = [mobieChargingProvider];

  return {
    meta: {
      id: "ev",
      label: "Carregamento EV",
      health: MOBIE_PROVIDER_STATUS.available ? "ready" : "unavailable",
      external: "MOBI.E / NAP AFIR (requer acesso autorizado)",
    },
    async recommend(ctx: EvContext): Promise<EvRecommendation | null> {
      if (ctx.lat == null || ctx.lng == null) return null;

      const target = ctx.targetPercent ?? 80;
      const batteryKwh = ctx.batteryKwh ?? 60;
      const needPct = Math.max(0, target - ctx.batteryPercent);
      if (needPct <= 0) return null;

      const all = (await Promise.all(providers.map((p) => p.search(ctx)))).flat();
      if (all.length === 0) return null;

      const energyKwh = (needPct / 100) * batteryKwh;
      const scored = all.map((s) => {
        const chargeMinutes = Math.max(5, Math.round((energyKwh / Math.max(s.powerKw, 1)) * 60));
        const etaMinutes = Math.round(s.distanceKm * 2.2);
        const cost =
          s.pricePerKwhCents != null ? Math.round(energyKwh * s.pricePerKwhCents) : null;
        let score = 500 - chargeMinutes - etaMinutes * 1.5 - s.distanceKm * 10;
        if (cost != null) score -= cost / 5;
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
        estimatedCostCents: best.cost ?? 0,
        etaMinutes: best.etaMinutes,
        reason:
          best.cost != null
            ? `Estimativa com base na tarifa disponível · ~${best.chargeMinutes} min.`
            : `Preço indisponível · ~${best.chargeMinutes} min de carga estimada.`,
        alternatives: scored.slice(1, 3).map((x) => x.s),
      };
    },
  };
}

export const evService = createEvService();

export function getEvUnavailableMessage(hasLocation: boolean): string {
  if (!hasLocation) {
    return "Precisamos da tua localização para procurar carregadores próximos.";
  }
  return MOBIE_PROVIDER_STATUS.reason;
}
