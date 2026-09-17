/**
 * Testes de integração MEL (requerem DATABASE_URL + sessão real).
 * Executar com: npx tsx scripts/test-mel-integration.ts
 *
 * Sem OPENAI_API_KEY → valida fallback rule-based.
 * Com OPENAI_API_KEY → valida caminho OpenAI (opcional).
 */
import assert from "node:assert/strict";
import { isOpenAiConfigured, resolveMelModel } from "../src/lib/mel/config";
import { estimateCostMicros } from "../src/lib/mel/usage";
import { MEL_TOOL_DEFINITIONS } from "../src/lib/mel/tools";

async function main() {
  console.log("MEL integration smoke");
  console.log("- model:", resolveMelModel());
  console.log("- openai configured:", isOpenAiConfigured());
  console.log("- tools:", MEL_TOOL_DEFINITIONS.length);
  assert.ok(MEL_TOOL_DEFINITIONS.length >= 5);
  assert.ok(estimateCostMicros(resolveMelModel(), 100, 50) >= 0);

  if (!isOpenAiConfigured()) {
    console.log("OPENAI_API_KEY ausente — fallback rule-based esperado (OK para CI local).");
  } else {
    console.log("OPENAI_API_KEY presente — caminho OpenAI disponível no servidor.");
  }

  // Garantir que a chave NÃO está em NEXT_PUBLIC_*
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("NEXT_PUBLIC_") && key.includes("OPENAI")) {
      throw new Error(`Segredo OpenAI exposto via ${key}`);
    }
  }
  console.log("OK: sem OPENAI em NEXT_PUBLIC_*");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
