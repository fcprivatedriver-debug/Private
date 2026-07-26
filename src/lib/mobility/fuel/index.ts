import type { FuelQuoteContext, FuelRecommendation, FuelService } from "./types";
import { prototypeFuelProvider } from "./providers/prototype";

export function createFuelService(): FuelService {
  const providers = [prototypeFuelProvider];

  return {
    meta: {
      id: "fuel",
      label: "Combustível",
      health: "prototype",
    },
    async recommend(ctx: FuelQuoteContext): Promise<FuelRecommendation | null> {
      const all = (
        await Promise.all(providers.map((p) => p.search(ctx)))
      ).flat();
      if (all.length === 0) return null;

      // Decision engine: preço + distância + cartões preferidos
      const scored = all.map((s) => {
        let score = 1000 - s.pricePerLitreCents / 10 - s.distanceKm * 8;
        if (ctx.preferredBrands?.some((b) => s.brand?.toLowerCase() === b.toLowerCase())) {
          score += 40;
        }
        if (
          ctx.preferredCards?.some((c) =>
            s.cardsAccepted.some((a) => a.toLowerCase() === c.toLowerCase()),
          )
        ) {
          score += 25;
        }
        return { s, score };
      });
      scored.sort((a, b) => b.score - a.score);
      const best = scored[0].s;
      const fillLitres =
        ctx.budgetEuros != null
          ? Math.round((ctx.budgetEuros * 10000) / best.pricePerLitreCents) / 10
          : null;
      const estimatedCostCents =
        fillLitres != null
          ? Math.round(fillLitres * best.pricePerLitreCents)
          : best.pricePerLitreCents * 30; // ~30L default estimate

      return {
        station: best,
        fillLitres,
        estimatedCostCents,
        reason: `Melhor equilíbrio entre preço (${(best.pricePerLitreCents / 100).toFixed(3)}€/L) e distância (${best.distanceKm} km).`,
        alternatives: scored.slice(1, 4).map((x) => x.s),
      };
    },
  };
}

export const fuelService = createFuelService();
