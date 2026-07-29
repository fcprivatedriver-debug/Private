/**
 * Guiões falados — dia / pendentes / prioridade.
 * Usado pelo router e pelos botões «Ouvir…».
 */
import type { Task } from "@prisma/client";
import type { AgendaItem } from "@/modules/calendar/agenda-shared";

const PRIORITY_RANK: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export function labelPriority(p: string): string {
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

function groupByPriority(tasks: Task[]): { high: Task[]; medium: Task[]; low: Task[] } {
  const high: Task[] = [];
  const medium: Task[] = [];
  const low: Task[] = [];
  for (const t of tasks) {
    if (t.priority === "URGENT" || t.priority === "HIGH") high.push(t);
    else if (t.priority === "LOW") low.push(t);
    else medium.push(t);
  }
  return { high, medium, low };
}

function listTitles(tasks: Task[]): string {
  return tasks.map((t) => t.title).join(", ");
}

/** Resposta falada agrupada por prioridade (com pausas via speakSequence). */
export function formatTodayByPriorityParts(tasks: Task[]): string[] {
  if (!tasks.length) {
    return ["Hoje não tens tarefas com prazo. Bom sinal — ou queres criar alguma?"];
  }
  const { high, medium, low } = groupByPriority(tasks);
  const parts: string[] = [
    `Hoje tens ${tasks.length} tarefa${tasks.length === 1 ? "" : "s"}, por prioridade.`,
  ];
  if (high.length) {
    parts.push(
      `A tua prioridade alta é: ${listTitles(high)}.`,
    );
  } else {
    parts.push("Não tens prioridades altas para hoje.");
  }
  if (medium.length) {
    parts.push(`Depois, em média: ${listTitles(medium)}.`);
  }
  if (low.length) {
    parts.push(`Por fim, em baixa: ${listTitles(low)}.`);
  }
  return parts;
}

export function formatTodayByPriorityText(tasks: Task[]): string {
  return formatTodayByPriorityParts(tasks).join(" ");
}

export function formatTopPriority(tasks: Task[]): string {
  const sorted = [...tasks].sort(
    (a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9),
  );
  if (!sorted.length) {
    return "Não tens tarefas para hoje — não há prioridade máxima a destacar.";
  }
  const top = sorted[0]!;
  return `A tua prioridade mais alta para hoje é «${top.title}» (${labelPriority(top.priority)}).`;
}

function timeLabel(d: Date, allDay?: boolean): string {
  if (allDay) return "todo o dia";
  return d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

/** Guião «Ouvir o meu dia» — agenda + tarefas, hora depois prioridade. */
export function formatDayBriefingParts(items: AgendaItem[]): string[] {
  if (!items.length) {
    return ["Hoje a agenda está livre. Sem tarefas nem eventos com hora."];
  }
  const parts: string[] = [
    `Para hoje tens ${items.length} item${items.length === 1 ? "" : "s"} na agenda.`,
  ];
  for (const item of items) {
    const when = timeLabel(item.startsAt, item.allDay);
    const kind = item.kind === "task" ? "tarefa" : "evento";
    const prio = item.priority ? `, prioridade ${labelPriority(item.priority)}` : "";
    parts.push(`Às ${when}: ${kind} «${item.title}»${prio}.`);
  }
  return parts;
}

export function formatDayBriefingText(items: AgendaItem[]): string {
  return formatDayBriefingParts(items).join(" ");
}

/** Guião «Ouvir pendentes» — tarefas não concluídas. */
export function formatPendingParts(tasks: Task[], tag?: string): string[] {
  let list = tasks.filter((t) => t.status === "TODO" || t.status === "IN_PROGRESS");
  if (tag) {
    const needle = tag.toLowerCase();
    list = list.filter((t) => t.tags.some((x) => x.toLowerCase() === needle));
  }
  list = [...list].sort((a, b) => {
    const ta = a.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const tb = b.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (ta !== tb) return ta - tb;
    return (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
  });
  if (!list.length) {
    return [
      tag
        ? `Não tens pendentes com a etiqueta ${tag}.`
        : "Não tens tarefas pendentes. Bom trabalho.",
    ];
  }
  const parts: string[] = [
    `Tens ${list.length} tarefa${list.length === 1 ? "" : "s"} pendente${list.length === 1 ? "" : "s"}.`,
  ];
  for (const t of list.slice(0, 20)) {
    const when = t.dueAt
      ? t.dueAt.toLocaleString("pt-PT", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "sem data";
    parts.push(`${t.title}, ${labelPriority(t.priority)}, até ${when}.`);
  }
  if (list.length > 20) {
    parts.push(`E mais ${list.length - 20} depois.`);
  }
  return parts;
}
