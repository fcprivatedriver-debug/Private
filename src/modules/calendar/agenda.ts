/**
 * Agregações da agenda (servidor) — NÃO importar em client components.
 */
import "server-only";

import type { CalendarEvent, Task } from "@prisma/client";
import { listEvents, slotFromDueAt } from "@/modules/calendar/service";
import {
  isTaskEventDone,
  parseTaskEventMeta,
  priorityColor,
} from "@/modules/calendar/markers";
import { registerCapability } from "@/core/capabilities";
import { prisma } from "@/lib/db";
import {
  sortAgendaItems,
  type AgendaItem,
  type AgendaItemDTO,
  type AgendaMode,
  type MonthDaySummary,
} from "@/modules/calendar/agenda-shared";
import {
  boundsForDayIso,
  formatDayIso,
  formatZonedTime,
  shiftDayIso,
  todayIso,
  zonedParts,
} from "@/lib/zoned-date";

export type { AgendaItem, AgendaItemDTO, AgendaMode, MonthDaySummary };
export {
  toAgendaDTO,
  sortAgendaItems,
  monthGrid,
  hourSlots,
  itemsForHour,
  shiftDay,
  hydrateAgendaItem,
} from "@/modules/calendar/agenda-shared";

const WEEKDAY_PT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"] as const;

function toAgendaItem(e: CalendarEvent): AgendaItem {
  const meta = parseTaskEventMeta(e.description);
  const priority = (meta?.priority as AgendaItem["priority"]) || null;
  return {
    id: e.id,
    title: e.title,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    allDay: e.allDay,
    source: e.source,
    color: e.color ?? (priority ? priorityColor(priority) : null),
    done: isTaskEventDone(e.description),
    taskId: meta?.taskId ?? (e.externalId?.startsWith("task:") ? e.externalId.slice(5) : null),
    priority,
    kind: e.source === "task-sync" || meta ? "task" : "event",
  };
}

/** Fallback: tarefa com data sem evento sync ainda aparece na agenda. */
function taskToAgendaItem(task: Task): AgendaItem {
  const due = task.dueAt!;
  const slot = slotFromDueAt(due);
  const done = task.status === "DONE";
  return {
    id: `task-fallback:${task.id}`,
    title: task.title,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    allDay: slot.allDay,
    source: "task-sync",
    color: done ? "#94A3B8" : priorityColor(task.priority),
    done,
    taskId: task.id,
    priority: task.priority,
    kind: "task",
  };
}

async function datedTasksInRange(
  userId: string,
  from: Date,
  to: Date,
): Promise<Task[]> {
  return prisma.task.findMany({
    where: {
      userId,
      dueAt: { not: null, gte: from, lte: to },
      status: { not: "CANCELLED" },
    },
  });
}

function mergeEventsAndTasks(
  events: CalendarEvent[],
  tasks: Task[],
): AgendaItem[] {
  const fromEvents = events.map(toAgendaItem);
  const linked = new Set(
    fromEvents.map((i) => i.taskId).filter((id): id is string => Boolean(id)),
  );
  const orphans = tasks
    .filter((t) => t.dueAt && !linked.has(t.id))
    .map(taskToAgendaItem);
  return sortAgendaItems([...fromEvents, ...orphans]);
}

export async function getDayItems(
  userId: string,
  dayIso: string,
): Promise<AgendaItem[]> {
  const { from, to } = boundsForDayIso(dayIso);
  const [events, tasks] = await Promise.all([
    listEvents(userId, { from, to }),
    datedTasksInRange(userId, from, to),
  ]);
  return mergeEventsAndTasks(events, tasks);
}

export async function getWeekItems(
  userId: string,
  dayIso: string,
): Promise<{ dayIso: string; label: string; items: AgendaItem[] }[]> {
  const p = dayIso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const y = p ? Number(p[1]) : zonedParts(new Date()).year;
  const mo = p ? Number(p[2]) : zonedParts(new Date()).month;
  const d = p ? Number(p[3]) : zonedParts(new Date()).day;
  const jsDay = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
  const mondayIso = shiftDayIso(dayIso, mondayOffset);
  const sundayIso = shiftDayIso(mondayIso, 6);
  const { from } = boundsForDayIso(mondayIso);
  const { to } = boundsForDayIso(sundayIso);
  const [events, tasks] = await Promise.all([
    listEvents(userId, { from, to }),
    datedTasksInRange(userId, from, to),
  ]);
  const items = mergeEventsAndTasks(events, tasks);

  return Array.from({ length: 7 }, (_, i) => {
    const iso = shiftDayIso(mondayIso, i);
    const dayItems = sortAgendaItems(
      items.filter((it) => formatDayIso(it.startsAt) === iso),
    );
    const wd = new Date(Date.UTC(
      Number(iso.slice(0, 4)),
      Number(iso.slice(5, 7)) - 1,
      Number(iso.slice(8, 10)),
    )).getUTCDay();
    return {
      dayIso: iso,
      label: `${WEEKDAY_PT[wd]} ${Number(iso.slice(8, 10))}`,
      items: dayItems,
    };
  });
}

export async function getMonthSummary(
  userId: string,
  monthIso: string,
): Promise<MonthDaySummary[]> {
  const y = Number(monthIso.slice(0, 4));
  const mo = Number(monthIso.slice(5, 7));
  const firstIso = `${monthIso.slice(0, 7)}-01`;
  const lastDay = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const lastIso = `${monthIso.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;
  const { from } = boundsForDayIso(firstIso);
  const { to } = boundsForDayIso(lastIso);
  const [events, tasks] = await Promise.all([
    listEvents(userId, { from, to }),
    datedTasksInRange(userId, from, to),
  ]);
  const items = mergeEventsAndTasks(events, tasks);
  const map = new Map<string, { count: number; top: "HIGH" | "MEDIUM" | "LOW" }>();
  const rank = (pr: string) => (pr === "URGENT" || pr === "HIGH" ? 0 : pr === "LOW" ? 2 : 1);

  for (const it of items) {
    if (it.done) continue;
    const key = formatDayIso(it.startsAt);
    let pr: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
    if (it.priority === "URGENT" || it.priority === "HIGH") pr = "HIGH";
    else if (it.priority === "LOW") pr = "LOW";
    else if (it.color === "#DC2626") pr = "HIGH";
    else if (it.color === "#94A3B8") pr = "LOW";

    const cur = map.get(key);
    if (!cur) map.set(key, { count: 1, top: pr });
    else {
      cur.count += 1;
      if (rank(pr) < rank(cur.top)) cur.top = pr;
    }
  }

  return Array.from({ length: lastDay }, (_, i) => {
    const day = `${monthIso.slice(0, 7)}-${String(i + 1).padStart(2, "0")}`;
    const hit = map.get(day);
    return {
      day,
      count: hit?.count ?? 0,
      topPriority: hit?.top ?? "MEDIUM",
    };
  });
}

/** Reexport helper for DTO labels in Lisbon. */
export function agendaTimeLabel(item: AgendaItem): string {
  if (item.allDay) return "Todo o dia";
  return formatZonedTime(item.startsAt);
}

export function registerAgendaCapabilities(): void {
  registerCapability("calendar.listRange", async ({ userId, from, to }) =>
    listEvents(userId, { from, to }),
  );
  registerCapability("calendar.monthSummary", async ({ userId, month }) =>
    getMonthSummary(userId, formatDayIso(month).slice(0, 7) + "-01"),
  );
}

export { todayIso };
