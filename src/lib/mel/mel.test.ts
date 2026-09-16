import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MEL_CONFIG,
  resolveMelModel,
  resolveMelMonthlyLimit,
  isOpenAiConfigured,
} from "./config";
import { estimateCostMicros } from "./usage";
import { executeMelTool, MEL_TOOL_DEFINITIONS, type MelAuthContext } from "./tools";
import { buildMelSystemPrompt } from "./system-prompt";
import type { ChatCompletionTool } from "openai/resources/chat/completions";

const auth: MelAuthContext = {
  userId: "user-filipe",
  memberId: "member-filipe",
  familyId: "family-1",
  role: "ADMIN",
  space: "personal",
  displayName: "Filipe",
  familyName: "Casa Filipe",
};

describe("MEL config", () => {
  it("usa modelo económico por omissão", () => {
    const prev = process.env.OPENAI_MODEL;
    delete process.env.OPENAI_MODEL;
    assert.equal(resolveMelModel(), MEL_CONFIG.defaultModel);
    assert.equal(MEL_CONFIG.defaultModel, "gpt-4o-mini");
    if (prev !== undefined) process.env.OPENAI_MODEL = prev;
  });

  it("respeita OPENAI_MODEL da env", () => {
    const prev = process.env.OPENAI_MODEL;
    process.env.OPENAI_MODEL = "gpt-4o-mini";
    assert.equal(resolveMelModel(), "gpt-4o-mini");
    if (prev === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = prev;
  });

  it("limite mensal configurável", () => {
    const prev = process.env.MEL_MONTHLY_LIMIT;
    delete process.env.MEL_MONTHLY_LIMIT;
    assert.equal(resolveMelMonthlyLimit(), MEL_CONFIG.defaultMonthlyLimit);
    process.env.MEL_MONTHLY_LIMIT = "50";
    assert.equal(resolveMelMonthlyLimit(), 50);
    if (prev === undefined) delete process.env.MEL_MONTHLY_LIMIT;
    else process.env.MEL_MONTHLY_LIMIT = prev;
  });

  it("não considera OpenAI configurada sem chave", () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    assert.equal(isOpenAiConfigured(), false);
    if (prev !== undefined) process.env.OPENAI_API_KEY = prev;
  });
});

describe("MEL usage cost estimate", () => {
  it("estima custo positivo para tokens", () => {
    const micros = estimateCostMicros("gpt-4o-mini", 1000, 500);
    assert.ok(micros > 0);
    assert.ok(micros < 10_000);
  });

  it("zero tokens → custo zero", () => {
    assert.equal(estimateCostMicros("gpt-4o-mini", 0, 0), 0);
  });
});

describe("MEL tools security", () => {
  it("expõe apenas tools READ conhecidas", () => {
    const names = MEL_TOOL_DEFINITIONS.map((t: ChatCompletionTool) =>
      t.type === "function" ? t.function.name : "",
    ).filter(Boolean);
    assert.deepEqual(names.sort(), [
      "get_budget_status",
      "get_expenses_by_category",
      "get_family_financial_summary",
      "get_financial_summary",
      "get_income_summary",
      "get_savings_and_goals",
    ]);
  });

  it("rejeita userId injectado pelo modelo (prompt injection / acesso horizontal)", async () => {
    const result = await executeMelTool(
      "get_financial_summary",
      JSON.stringify({ userId: "user-joao", monthOffset: 0 }),
      auth,
    );
    assert.deepEqual(result, { error: "Pedido inválido." });
  });

  it("rejeita familyId e memberId injectados", async () => {
    const a = await executeMelTool(
      "get_family_financial_summary",
      JSON.stringify({ familyId: "outra-familia" }),
      auth,
    );
    assert.deepEqual(a, { error: "Pedido inválido." });

    const b = await executeMelTool(
      "get_expenses_by_category",
      JSON.stringify({ memberId: "member-joao", categoryHint: "restaurantes" }),
      auth,
    );
    assert.deepEqual(b, { error: "Pedido inválido." });
  });

  it("rejeita tool desconhecida", async () => {
    const result = await executeMelTool("drop_database", "{}", auth);
    assert.deepEqual(result, { error: "Ferramenta desconhecida." });
  });

  it("rejeita JSON inválido", async () => {
    const result = await executeMelTool("get_financial_summary", "{not-json", auth);
    assert.deepEqual(result, { error: "Parâmetros inválidos." });
  });
});

describe("MEL system prompt", () => {
  it("inclui identidade addYknow / MEL e regras de precisão", () => {
    const prompt = buildMelSystemPrompt(auth);
    assert.match(prompt, /addYknow/);
    assert.match(prompt, /MEL/);
    assert.match(prompt, /NUNCA inventes/i);
    assert.doesNotMatch(prompt, /AddYnow|addYnow|AddYknow/);
    assert.match(prompt, /Filipe/);
  });
});
