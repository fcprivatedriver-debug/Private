/**
 * Marcadores em CalendarEvent.description — sem alterar o schema Prisma.
 * Vincula evento ↔ tarefa e estado concluído.
 */

export const MEL_TASK_MARKER = "mel-task";

export type TaskEventMeta = {
  taskId: string;
  priority: string;
  status: "OPEN" | "DONE";
};

export function buildTaskEventDescription(meta: TaskEventMeta, note?: string): string {
  const base = `${MEL_TASK_MARKER}|taskId=${meta.taskId}|priority=${meta.priority}|status=${meta.status}`;
  return note ? `${base}\n${note}` : base;
}

export function parseTaskEventMeta(description: string | null | undefined): TaskEventMeta | null {
  if (!description?.startsWith(MEL_TASK_MARKER)) return null;
  const line = description.split("\n")[0] || "";
  const taskId = line.match(/taskId=([^|]+)/)?.[1];
  if (!taskId) return null;
  const priority = line.match(/priority=([^|]+)/)?.[1] || "MEDIUM";
  const status = line.match(/status=([^|]+)/)?.[1] === "DONE" ? "DONE" : "OPEN";
  return { taskId, priority, status };
}

export function isTaskEventDone(description: string | null | undefined): boolean {
  return parseTaskEventMeta(description)?.status === "DONE";
}

export function priorityColor(priority: string): string {
  switch (priority) {
    case "URGENT":
    case "HIGH":
      return "#DC2626";
    case "LOW":
      return "#94A3B8";
    default:
      return "#D97706";
  }
}

export function doneColor(): string {
  return "#94A3B8";
}
