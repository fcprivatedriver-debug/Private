import type { CalendarEvent } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addMinutes } from "date-fns";
import { registerCapability } from "@/core/capabilities";
import {
  endOfZonedDay,
  formatDayIso,
  isUntimedDueAt,
  startOfZonedDay,
  shiftDayIso,
  todayIso,
  zonedDateTimeToUtc,
  zonedParts,
} from "@/lib/zoned-date";

export type CreateEventInput = {
  userId: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: Date;
  endsAt: Date;
  allDay?: boolean;
  source?: string;
  color?: string;
  externalId?: string;
};

export type UpdateEventInput = Partial<{
  title: string;
  description: string | null;
  location: string | null;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  color: string | null;
}>;

export function taskExternalId(taskId: string): string {
  return `task:${taskId}`;
}

export async function listEvents(
  userId: string,
  range: { from: Date; to: Date },
): Promise<CalendarEvent[]> {
  return prisma.calendarEvent.findMany({
    where: {
      userId,
      startsAt: { lte: range.to },
      endsAt: { gte: range.from },
    },
    orderBy: { startsAt: "asc" },
  });
}

export async function listToday(userId: string, now = new Date()) {
  return listEvents(userId, {
    from: startOfZonedDay(now),
    to: endOfZonedDay(now),
  });
}

export async function listWeek(userId: string, now = new Date()) {
  const iso = formatDayIso(now);
  const p = zonedParts(now);
  // Segunda da semana civil (Seg=1 … Dom=0→7)
  const jsDay = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
  const mondayIso = shiftDayIso(iso, mondayOffset);
  const sundayIso = shiftDayIso(mondayIso, 6);
  const from = zonedDateTimeToUtc(
    Number(mondayIso.slice(0, 4)),
    Number(mondayIso.slice(5, 7)),
    Number(mondayIso.slice(8, 10)),
    0,
    0,
    0,
    0,
  );
  const to = zonedDateTimeToUtc(
    Number(sundayIso.slice(0, 4)),
    Number(sundayIso.slice(5, 7)),
    Number(sundayIso.slice(8, 10)),
    23,
    59,
    59,
    999,
  );
  return listEvents(userId, { from, to });
}

export async function createEvent(input: CreateEventInput): Promise<CalendarEvent> {
  return prisma.calendarEvent.create({
    data: {
      userId: input.userId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      location: input.location?.trim() || null,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      allDay: input.allDay ?? false,
      source: input.source ?? "manual",
      color: input.color ?? null,
      externalId: input.externalId ?? null,
    },
  });
}

export async function updateEvent(
  userId: string,
  eventId: string,
  data: UpdateEventInput,
): Promise<CalendarEvent | null> {
  const existing = await prisma.calendarEvent.findFirst({
    where: { id: eventId, userId },
  });
  if (!existing) return null;
  return prisma.calendarEvent.update({
    where: { id: eventId },
    data,
  });
}

export async function deleteEvent(userId: string, eventId: string): Promise<boolean> {
  const existing = await prisma.calendarEvent.findFirst({
    where: { id: eventId, userId },
  });
  if (!existing) return false;
  await prisma.calendarEvent.delete({ where: { id: eventId } });
  return true;
}

export async function findEventByExternalId(
  userId: string,
  externalId: string,
): Promise<CalendarEvent | null> {
  return prisma.calendarEvent.findFirst({
    where: { userId, externalId },
  });
}

/** Sugere um slot amanhã (ou hoje) à hora indicada em Lisbon. */
export function suggestSlot(opts: {
  dayHint?: "today" | "tomorrow";
  hour?: number;
  durationMinutes?: number;
}): { startsAt: Date; endsAt: Date } {
  const baseIso =
    opts.dayHint === "today" ? todayIso() : shiftDayIso(todayIso(), 1);
  const hour = opts.hour ?? 10;
  const duration = opts.durationMinutes ?? 60;
  const y = Number(baseIso.slice(0, 4));
  const mo = Number(baseIso.slice(5, 7));
  const d = Number(baseIso.slice(8, 10));
  const startsAt = zonedDateTimeToUtc(y, mo, d, hour, 0, 0, 0);
  const endsAt = addMinutes(startsAt, duration);
  return { startsAt, endsAt };
}

export function slotFromDueAt(dueAt: Date): {
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
} {
  if (isUntimedDueAt(dueAt)) {
    return {
      startsAt: startOfZonedDay(dueAt),
      endsAt: endOfZonedDay(dueAt),
      allDay: true,
    };
  }
  return {
    startsAt: new Date(dueAt),
    endsAt: addMinutes(dueAt, 30),
    allDay: false,
  };
}

export function registerCalendarCapabilities(): void {
  registerCapability("calendar.create", async (input) => createEvent(input));
  registerCapability("calendar.update", async ({ userId, eventId, data }) =>
    updateEvent(userId, eventId, data),
  );
  registerCapability("calendar.delete", async ({ userId, eventId }) =>
    deleteEvent(userId, eventId),
  );
  registerCapability("calendar.findByExternalId", async ({ userId, externalId }) =>
    findEventByExternalId(userId, externalId),
  );
}

export const calendarModule = {
  meta: { id: "CALENDAR" as const, label: "Calendário" },
  listEvents,
  listToday,
  listWeek,
  createEvent,
  updateEvent,
  deleteEvent,
  findEventByExternalId,
  suggestSlot,
  registerCalendarCapabilities,
};
