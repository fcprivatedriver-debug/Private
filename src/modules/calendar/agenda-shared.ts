/**
 * Utilitários e tipos da agenda — seguros para client components.
 * (Sem Prisma / sem service imports.)
 */
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addDays,
} from "date-fns";

import type { MonthDaySummary } from "@/core/capabilities";

export type { MonthDaySummary };

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

export function hydrateAgendaItem(dto: AgendaItemDTO): AgendaItem {
  return {
    ...dto,
    startsAt: new Date(dto.startsAt),
    endsAt: new Date(dto.endsAt),
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
