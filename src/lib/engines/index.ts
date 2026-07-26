/**
 * Nina V3 — Intelligence Engines (façade pública).
 * Sem novos ecrãs: os engines alimentam voz/chat existentes.
 */

export * from "./types";
export { cacheGet, cacheSet, cacheKey } from "./cache";
export {
  pickBest,
  buildRecommendation,
  assertJustified,
} from "./recommendation";
export { shoppingEngine } from "./shopping-engine";
export { fuelEngine } from "./fuel-engine";
export { evEngine } from "./ev-engine";
export { savingEngine } from "./saving-engine";
export { learningEngine } from "./learning-engine";
export { intelligenceLayer, runIntelligence } from "./intelligence";
export { listProviders } from "./providers";
export type { ProviderKind, ProviderDescriptor } from "./providers";
