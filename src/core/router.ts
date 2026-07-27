/**
 * Router de intenções — detectIntent → capability certa.
 */
import { invokeCapability, type DetectedIntent } from "@/core/capabilities";
import type { Task } from "@prisma/client";

const PRIORITY_RANK: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export function formatTodayTasksReply(tasks: Task[]): string {
  if (!tasks.length) {
    return "Hoje não tens tarefas com prazo. Bom sinal — ou queres criar alguma?";
  }
  const sorted = [...tasks].sort(
    (a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9),
  );
  const n = sorted.length;
  const top = sorted[0]!;
  const lines = sorted
    .map((t, i) => `${i + 1}. ${t.title} (${labelPriority(t.priority)})`)
    .join("\n");
  return `Hoje tens ${n} tarefa${n === 1 ? "" : "s"}. A prioridade mais alta é «${top.title}».\n${lines}`;
}

function labelPriority(p: string): string {
  switch (p) {
    case "URGENT":
      return "urgente";
    case "HIGH":
      return "alta";
    case "LOW":
      return "baixa";
    default:
      return "média";
  }
}

export type RouteResult = {
  ok: boolean;
  reply: string;
  intent: DetectedIntent["kind"] | "capture";
  spokeHint?: string;
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
      if (!tasks.length) {
        return {
          ok: true,
          reply: "Não tens tarefas para hoje — não há prioridade máxima a destacar.",
          intent: detected.kind,
        };
      }
      const top = tasks[0]!;
      return {
        ok: true,
        reply: `A tua prioridade mais alta para hoje é «${top.title}» (${labelPriority(top.priority)}).`,
        intent: detected.kind,
      };
    }
    return {
      ok: true,
      reply: formatTodayTasksReply(tasks),
      intent: detected.kind,
    };
  }

  // Captura (criar tarefa/evento/lembrete) — delegada ao processador de voz
  const { processDetectedCapture } = await import("@/modules/voice/service");
  const capture = await processDetectedCapture(userId, utterance, detected);
  return {
    ok: capture.ok,
    reply: capture.reply,
    intent: "capture",
  };
}
