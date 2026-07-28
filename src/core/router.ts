/**
 * Router de intenções — detectIntent → capability certa.
 */
import { invokeCapability, type DetectedIntent } from "@/core/capabilities";
import {
  formatTodayByPriorityParts,
  formatTodayByPriorityText,
  formatTopPriority,
} from "@/modules/voice/briefing";

export type RouteResult = {
  ok: boolean;
  reply: string;
  /** Blocos para TTS com pausas (prioridade). */
  speakParts?: string[];
  intent: DetectedIntent["kind"] | "capture";
};

/**
 * Processa uma frase do utilizador: perguntas sobre tarefas ou captura.
 */
export async function routeUtterance(
  userId: string,
  utterance: string,
): Promise<RouteResult> {
  const detected = await invokeCapability("voice.detectIntent", { utterance });

  if (detected.kind === "query_today_tasks" || detected.kind === "query_top_priority") {
    const tasks = await invokeCapability("tasks.list", {
      userId,
      filter: {
        dueAtDay: "today",
        sortBy: "priority",
        status: ["TODO", "IN_PROGRESS"],
      },
    });
    if (detected.kind === "query_top_priority") {
      const reply = formatTopPriority(tasks);
      return {
        ok: true,
        reply,
        speakParts: [reply],
        intent: detected.kind,
      };
    }
    const parts = formatTodayByPriorityParts(tasks);
    return {
      ok: true,
      reply: formatTodayByPriorityText(tasks),
      speakParts: parts,
      intent: detected.kind,
    };
  }

  const { processDetectedCapture } = await import("@/modules/voice/service");
  const capture = await processDetectedCapture(userId, utterance, detected);
  return {
    ok: capture.ok,
    reply: capture.reply,
    speakParts: [capture.reply],
    intent: "capture",
  };
}
