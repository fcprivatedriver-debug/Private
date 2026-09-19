import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { prisma } from "@/lib/db";
import type { NinaReply } from "@/lib/ai/nina-assistant";
import {
  MEL_CONFIG,
  isOpenAiConfigured,
  resolveMelModel,
} from "./config";
import { getOpenAI } from "./openai";
import { buildMelSystemPrompt } from "./system-prompt";
import {
  MEL_TOOL_DEFINITIONS,
  executeMelTool,
  type MelAuthContext,
} from "./tools";
import { checkMelRateLimit, logMelUsage, estimateCostMicros } from "./usage";

export type MelSource = "openai" | "fallback" | "rate_limit" | "unavailable";

export type MelOrchestratorResult = {
  text: string;
  suggestions?: string[];
  tone: NinaReply["tone"];
  source: MelSource;
};

const DEFAULT_SUGGESTIONS = [
  "Quanto gastei este mês?",
  "Onde posso poupar?",
  "Quanto me resta?",
];

const UNAVAILABLE =
  "A MEL está temporariamente indisponível. Tenta novamente dentro de alguns instantes.";

const RATE_LIMIT_MSG =
  "Atingiste o limite mensal de conversas com a MEL. No próximo mês volta a teres disponibilidade — ou contacta-nos se precisares de um plano com mais interações.";

function truncateMessage(text: string): string {
  const t = text.trim();
  if (t.length <= MEL_CONFIG.maxUserMessageChars) return t;
  return t.slice(0, MEL_CONFIG.maxUserMessageChars);
}

async function loadRecentChatHistory(
  userId: string,
  familyId: string,
): Promise<ChatCompletionMessageParam[]> {
  const rows = await prisma.aiInsight.findMany({
    where: { userId, familyId, kind: "chat" },
    orderBy: { createdAt: "desc" },
    take: MEL_CONFIG.maxHistoryTurns,
    select: { title: true, body: true },
  });

  const chronological = rows.reverse();
  const messages: ChatCompletionMessageParam[] = [];
  for (const row of chronological) {
    const q = (row.title || "").trim();
    const a = (row.body || "").trim();
    if (q) messages.push({ role: "user", content: q.slice(0, 400) });
    if (a) messages.push({ role: "assistant", content: a.slice(0, 600) });
  }
  return messages;
}

function needsFinancialTools(question: string): boolean {
  const q = question
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return /(quanto|saldo|gastei|gastamos|gaste|recebi|receita|despesa|orcamento|orçamento|poup|objetivo|meta|categoria|restaurante|supermercado|mes passado|mês passado|este mes|este mês|familia|família|disponivel|disponível|onde gastei|onde tenho mais|onde esta o dinheiro|onde está o dinheiro)/.test(
    q,
  );
}

/**
 * Orquestra a conversa MEL com OpenAI + tools seguras.
 * Em falha ou sem chave → fallback rule-based (sem inventar no LLM).
 */
export async function runMelConversation(opts: {
  auth: MelAuthContext;
  question: string;
  fallback: () => NinaReply | Promise<NinaReply>;
}): Promise<MelOrchestratorResult> {
  const question = truncateMessage(opts.question);
  if (!question) {
    return {
      text: "Diz-me em que te posso ajudar nas tuas finanças.",
      tone: "warm",
      source: "fallback",
      suggestions: DEFAULT_SUGGESTIONS,
    };
  }

  // Evitar OpenAI para input manifestamente incompleto (ex.: "ond")
  const { gateMelUtterance } = await import("@/lib/mel/utterance-gate");
  const gate = gateMelUtterance(question);
  if (gate.action === "complete") {
    return {
      text: gate.message,
      tone: "warm",
      source: "fallback",
      suggestions: gate.suggestions,
    };
  }

  if (!isOpenAiConfigured()) {
    const fb = await opts.fallback();
    return {
      text: fb.text,
      tone: fb.tone,
      suggestions: fb.suggestions ?? DEFAULT_SUGGESTIONS,
      source: "fallback",
    };
  }

  const limit = await checkMelRateLimit(opts.auth.userId);
  if (!limit.ok) {
    return {
      text: RATE_LIMIT_MSG,
      tone: "careful",
      source: "rate_limit",
      suggestions: ["Quanto gastei este mês?"],
    };
  }

  const client = getOpenAI();
  if (!client) {
    const fb = await opts.fallback();
    return {
      text: fb.text,
      tone: fb.tone,
      suggestions: fb.suggestions ?? DEFAULT_SUGGESTIONS,
      source: "fallback",
    };
  }

  const model = resolveMelModel();
  let promptTokens = 0;
  let completionTokens = 0;
  const forceTools = needsFinancialTools(question);

  try {
    const history = await loadRecentChatHistory(opts.auth.userId, opts.auth.familyId);
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: buildMelSystemPrompt(opts.auth) },
      ...history,
      { role: "user", content: question },
    ];

    let finalText: string | null = null;
    let usedTool = false;

    for (let round = 0; round < MEL_CONFIG.maxToolRounds; round++) {
      const completion = await client.chat.completions.create({
        model,
        temperature: MEL_CONFIG.temperature,
        max_tokens: MEL_CONFIG.maxOutputTokens,
        messages,
        tools: MEL_TOOL_DEFINITIONS,
        tool_choice:
          forceTools && round === 0 && !usedTool
            ? "required"
            : "auto",
      });

      promptTokens += completion.usage?.prompt_tokens ?? 0;
      completionTokens += completion.usage?.completion_tokens ?? 0;

      const choice = completion.choices[0]?.message;
      if (!choice) break;

      if (choice.tool_calls?.length) {
        usedTool = true;
        messages.push({
          role: "assistant",
          content: choice.content,
          tool_calls: choice.tool_calls,
        });

        for (const call of choice.tool_calls) {
          if (call.type !== "function") continue;
          const result = await executeMelTool(
            call.function.name,
            call.function.arguments || "{}",
            opts.auth,
          );
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(result).slice(0, 4_000),
          });
        }
        continue;
      }

      finalText = (choice.content || "").trim();
      break;
    }

    if (forceTools && !usedTool) {
      // Segurança: perguntas financeiras sem tool → fallback com dados reais Prisma
      const fb = await opts.fallback();
      await logMelUsage({
        userId: opts.auth.userId,
        familyId: opts.auth.familyId,
        model,
        promptTokens,
        completionTokens,
        success: false,
        errorCode: "financial_without_tool",
      });
      return {
        text: fb.text,
        tone: fb.tone,
        suggestions: fb.suggestions ?? DEFAULT_SUGGESTIONS,
        source: "fallback",
      };
    }

    await logMelUsage({
      userId: opts.auth.userId,
      familyId: opts.auth.familyId,
      model,
      promptTokens,
      completionTokens,
      estimatedCostMicros: estimateCostMicros(model, promptTokens, completionTokens),
      success: Boolean(finalText),
      errorCode: finalText ? null : "empty_response",
    });

    if (!finalText) {
      const fb = await opts.fallback();
      return {
        text: fb.text,
        tone: fb.tone,
        suggestions: fb.suggestions ?? DEFAULT_SUGGESTIONS,
        source: "fallback",
      };
    }

    return {
      text: finalText,
      tone: "warm",
      suggestions: DEFAULT_SUGGESTIONS,
      source: "openai",
    };
  } catch (err) {
    const code =
      err && typeof err === "object" && "status" in err
        ? `http_${String((err as { status?: number }).status)}`
        : err instanceof Error
          ? err.name
          : "unknown";
    console.error("[mel] openai error", code, err instanceof Error ? err.message : err);

    await logMelUsage({
      userId: opts.auth.userId,
      familyId: opts.auth.familyId,
      model,
      promptTokens,
      completionTokens,
      success: false,
      errorCode: code,
    });

    try {
      const fb = await opts.fallback();
      return {
        text: fb.text,
        tone: fb.tone,
        suggestions: fb.suggestions ?? DEFAULT_SUGGESTIONS,
        source: "fallback",
      };
    } catch {
      return {
        text: UNAVAILABLE,
        tone: "careful",
        source: "unavailable",
        suggestions: DEFAULT_SUGGESTIONS,
      };
    }
  }
}
