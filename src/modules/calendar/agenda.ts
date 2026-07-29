/**
 * Agregações da agenda (servidor) — NÃO importar em client components.
 * Usa agenda-shared para tipos/helpers puros.
 */
import "server-only";

import type { CalendarEvent } from "@prisma/client";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
} from "date-fns";
import { pt } from "date-fns/locale";
import { listEvents } from "@/modules/calendar/service";
import {
  isTaskEventDone,
  parseTaskEventMeta,
  priorityColor,
} from "@/modules/calendar/markers";
import { registerCapability } from "@/core/capabilities";
import {
  sortAgendaItems,
  type AgendaItem,
  type AgendaItemDTO,
  type AgendaMode,
  type MonthDaySummary,
} from "@/modules/calendar/agenda-shared";

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

export async function getDayItems(userId: string, day: Date): Promise<AgendaItem[]> {
  const events = await listEvents(userId, {
    from: startOfDay(day),
    to: endOfDay(day),
  });
  return sortAgendaItems(events.map(toAgendaItem));
}

export async function getWeekItems(
  userId: string,
  day: Date,
): Promise<{ day: Date; label: string; items: AgendaItem[] }[]> {
  const from = startOfWeek(day, { weekStartsOn: 1 });
  const to = endOfWeek(day, { weekStartsOn: 1 });
  const events = await listEvents(userId, { from, to });
  const items = events.map(toAgendaItem);
  return eachDayOfInterval({ start: from, end: to }).map((d) => {
    const key = format(d, "yyyy-MM-dd");
    const dayItems = sortAgendaItems(
      items.filter((i) => format(i.startsAt, "yyyy-MM-dd") === key),
    );
    return {
      day: d,
      label: format(d, "EEE d", { locale: pt }),
      items: dayItems,
    };
  });
}

/**
 * Resumo mensal agregado (sem N items por célula) — um dot + contagem.
 */
export async function getMonthSummary(
  userId: string,
  month: Date,
): Promise<MonthDaySummary[]> {
  const from = startOfMonth(month);
  const to = endOfMonth(month);
  const events = await listEvents(userId, { from, to });
  const map = new Map<string, { count: number; top: "HIGH" | "MEDIUM" | "LOW" }>();
  const rank = (p: string) => (p === "URGENT" || p === "HIGH" ? 0 : p === "LOW" ? 2 : 1);

  for (const e of events) {
    if (isTaskEventDone(e.description)) continue;
    const key = format(e.startsAt, "yyyy-MM-dd");
    const meta = parseTaskEventMeta(e.description);
    let p: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
    if (meta?.priority === "URGENT" || meta?.priority === "HIGH") p = "HIGH";
    else if (meta?.priority === "LOW") p = "LOW";
    else if (e.color === "#DC2626") p = "HIGH";
    else if (e.color === "#94A3B8") p = "LOW";

    const cur = map.get(key);
    if (!cur) {
      map.set(key, { count: 1, top: p });
    } else {
      cur.count += 1;
      if (rank(p) < rank(cur.top)) cur.top = p;
    }
  }

  return eachDayOfInterval({ start: from, end: to }).map((d) => {
    const day = format(d, "yyyy-MM-dd");
    const hit = map.get(day);
    return {
      day,
      count: hit?.count ?? 0,
      topPriority: hit?.top ?? "MEDIUM",
    };
  });
}

export function registerAgendaCapabilities(): void {
  registerCapability("calendar.listRange", async ({ userId, from, to }) =>
    listEvents(userId, { from, to }),
  );
  registerCapability("calendar.monthSummary", async ({ userId, month }) =>
    getMonthSummary(userId, month),
  );
}
