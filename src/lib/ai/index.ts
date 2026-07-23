import type { AiVerificationProvider } from "./types";
import { HeuristicAiVerificationProvider } from "./heuristic-provider";

let provider: AiVerificationProvider | null = null;

/**
 * Returns the active AI verification provider.
 * Phase foundation: heuristic engine (explainable, no external dependency).
 * When OPENAI_API_KEY is present in future, swap to LLM-backed provider.
 */
export function getAiVerificationProvider(): AiVerificationProvider {
  if (!provider) {
    provider = new HeuristicAiVerificationProvider();
  }
  return provider;
}
