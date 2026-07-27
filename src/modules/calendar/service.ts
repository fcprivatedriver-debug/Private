import type { CalendarEvent } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  addDays,
  addMinutes,
} from "date-fns";
import { registerCapability } from "@/core/capabilities";

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
  return listEvents(userId, { from: startOfDay(now), to: endOfDay(now) });
}

export async function listWeek(userId: string, now = new Date()) {
  return listEvents(userId, {
    from: startOfWeek(now, { weekStartsOn: 1 }),
    to: endOfWeek(now, { weekStartsOn: 1 }),
  });
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

/** Sugere um slot amanhã à hora indicada (ou 10:00). */
export function suggestSlot(opts: {
  dayHint?: "today" | "tomorrow";
  hour?: number;
  durationMinutes?: number;
}): { startsAt: Date; endsAt: Date } {
  const day = new Date();
  if (opts.dayHint === "tomorrow" || !opts.dayHint) {
    day.setDate(day.getDate() + 1);
  }
  const hour = opts.hour ?? 10;
  const duration = opts.durationMinutes ?? 60;
  const startsAt = new Date(day);
  startsAt.setHours(hour, 0, 0, 0);
  const endsAt = addDays(startsAt, 0);
  endsAt.setMinutes(endsAt.getMinutes() + duration);
  return { startsAt, endsAt };
}

export function slotFromDueAt(dueAt: Date): { startsAt: Date; endsAt: Date; allDay: boolean } {
  const startsAt = new Date(dueAt);
  const looksAllDay =
    startsAt.getHours() === 23 && startsAt.getMinutes() >= 50;
  if (looksAllDay) {
    const dayStart = startOfDay(startsAt);
    return {
      startsAt: dayStart,
      endsAt: endOfDay(startsAt),
      allDay: true,
    };
  }
  return {
    startsAt,
    endsAt: addMinutes(startsAt, 30),
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
