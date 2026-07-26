/**
 * Shopping Engine — independente, fala só com Product Providers.
 *
 * ProductSearch → ShoppingListAnalyzer → BasketOptimizer →
 * PriceComparator → Promotions → StoreRanking → SavingCalculator
 */

import { compareBasket, searchProducts } from "@/lib/products";
import type { BasketCompareResult, ProductSearchResult } from "@/lib/products";
import { formatEUR } from "@/lib/money";
import { cacheGet, cacheSet, cacheKey } from "./cache";
import { assertJustified, buildRecommendation } from "./recommendation";
import type { EngineResult } from "./types";

export type ShoppingListLine = {
  name: string;
  brand?: string | null;
  quantity?: string | null;
};

export type ShoppingEngineAnalysis = {
  itemCount: number;
  comparison: BasketCompareResult;
  recommendedStore: string | null;
  savingsCents: number;
  ranking: { storeName: string; totalCents: number; missing: number }[];
};

/** ProductSearch — pesquisa via providers (nunca API directa no engine). */
export async function productSearch(query: string): Promise<ProductSearchResult> {
  const key = cacheKey(["shop-search", query.toLowerCase().trim()]);
  const cached = cacheGet<ProductSearchResult>(key);
  if (cached) return cached;
  const result = await searchProducts(query);
  return cacheSet(key, result, 90_000);
}

/** ShoppingListAnalyzer + PriceComparator + StoreRanking + SavingCalculator */
export async function analyzeShoppingList(
  items: ShoppingListLine[],
): Promise<ShoppingEngineAnalysis> {
  const names = items.map((i) => i.name).filter(Boolean);
  const key = cacheKey(["shop-basket", ...names.map((n) => n.toLowerCase()).sort()]);
  const cached = cacheGet<ShoppingEngineAnalysis>(key);
  if (cached) return cached;

  const comparison = await compareBasket(names);
  const ranking = comparison.quotes
    .filter((q) => q.lines.some((l) => l.found))
    .map((q) => ({
      storeName: q.storeName,
      totalCents: q.totalCents,
      missing: q.missing.length,
    }))
    .sort((a, b) => a.totalCents - b.totalCents);

  const analysis: ShoppingEngineAnalysis = {
    itemCount: names.length,
    comparison,
    recommendedStore: comparison.best?.storeName ?? null,
    savingsCents: comparison.savingsCents,
    ranking,
  };
  return cacheSet(key, analysis, 60_000);
}

/**
 * BasketOptimizer — devolve UMA recomendação justificada (nunca só preços).
 */
export async function optimizeBasket(items: ShoppingListLine[]): Promise<EngineResult> {
  if (items.length === 0) {
    return {
      ok: true,
      recommendation: buildRecommendation({
        engine: "shopping",
        bestLabel: "lista vazia",
        opener:
          "A tua lista está vazia por agora. Diz-me o que precisas — por exemplo «Nina, adiciona leite Vigor».",
        reason: "Sem artigos ainda não consigo comparar supermercados.",
      }),
      recordImpact: false,
    };
  }

  const analysis = await analyzeShoppingList(items);
  const best = analysis.comparison.best;
  const second = analysis.ranking[1];

  if (!best) {
    return {
      ok: true,
      recommendation: buildRecommendation({
        engine: "shopping",
        bestLabel: "sem cotação",
        opener: "Ainda não consegui comparar preços para estes artigos.",
        reason: "Tenta mais tarde ou adiciona marcas específicas.",
      }),
      recordImpact: false,
    };
  }

  const savings = analysis.savingsCents;
  const opener =
    savings > 0 && second
      ? `Hoje compensa fazer as compras no ${best.storeName}. O teu carrinho fica aproximadamente ${formatEUR(savings)} mais barato do que no ${second.storeName}.`
      : `Hoje os totais estão próximos — recomendo o ${best.storeName} (${formatEUR(best.totalCents)}) por ser a opção mais conveniente com a tua lista.`;

  const lines = analysis.ranking
    .slice(0, 3)
    .map((r) => `${r.storeName}: ${formatEUR(r.totalCents)}`)
    .join(" · ");

  const reply = assertJustified(
    `${opener} Olhei para ${analysis.itemCount} artigos (${lines}).`,
  );

  return {
    ok: true,
    recommendation: {
      engine: "shopping",
      headline: best.storeName,
      reason:
        savings > 0
          ? `Carrinho mais barato face à 2.ª opção (${second?.storeName ?? "outras"}).`
          : "Melhor equilíbrio preço/cobertura da lista.",
      reply,
      savingsCents: savings > 0 ? savings : undefined,
      alternativesCount: Math.max(0, analysis.ranking.length - 1),
      data: { ranking: analysis.ranking, comparison: analysis.comparison },
    },
    recordImpact: savings > 0,
  };
}

export const shoppingEngine = {
  productSearch,
  analyzeShoppingList,
  optimizeBasket,
};
