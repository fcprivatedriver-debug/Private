/**
 * Agregações da agenda — lógica no módulo calendar (não nas app routes).
 */
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
  addDays,
} from "date-fns";
import { pt } from "date-fns/locale";
import { listEvents } from "@/modules/calendar/service";
import {
  isTaskEventDone,
  parseTaskEventMeta,
  priorityColor,
} from "@/modules/calendar/markers";
import type { MonthDaySummary } from "@/core/capabilities";
import { registerCapability } from "@/core/capabilities";

export type AgendaMode = "day" | "week" | "month";

export type AgendaItem = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  source: string;
  color: string | null;
  done: boolean;
  taskId: string | null;
  priority: "HIGH" | "MEDIUM" | "LOW" | "URGENT" | null;
  kind: "event" | "task";
};

export type AgendaItemDTO = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  source: string;
  color: string | null;
  done: boolean;
  taskId: string | null;
  priority: "HIGH" | "MEDIUM" | "LOW" | "URGENT" | null;
  kind: "event" | "task";
};

export function toAgendaDTO(item: AgendaItem): AgendaItemDTO {
  return {
    ...item,
    startsAt: item.startsAt.toISOString(),
    endsAt: item.endsAt.toISOString(),
  };
}

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

export function sortAgendaItems(items: AgendaItem[]): AgendaItem[] {
  const rank: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  return [...items].sort((a, b) => {
    const ta = a.allDay ? 0 : a.startsAt.getTime();
    const tb = b.allDay ? 0 : b.startsAt.getTime();
    if (ta !== tb) return ta - tb;
    return (rank[a.priority || "MEDIUM"] ?? 9) - (rank[b.priority || "MEDIUM"] ?? 9);
  });
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
export async function getMonthSummary(userId: string, month: Date): Promise<MonthDaySummary[]> {
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

/** Grelha mês 5–6×7 incluindo dias fora do mês (padding Seg–Dom). */
export function monthGrid(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export function hourSlots(): number[] {
  return Array.from({ length: 24 }, (_, i) => i);
}

export function itemsForHour(items: AgendaItem[], hour: number): AgendaItem[] {
  return items.filter((i) => {
    if (i.allDay) return hour === 0;
    return i.startsAt.getHours() === hour;
  });
}

export function shiftDay(day: Date, delta: number): Date {
  return addDays(day, delta);
}

export function registerAgendaCapabilities(): void {
  registerCapability("calendar.listRange", async ({ userId, from, to }) =>
    listEvents(userId, { from, to }),
  );
  registerCapability("calendar.monthSummary", async ({ userId, month }) =>
    getMonthSummary(userId, month),
  );
}
