/**
 * Módulo Hábitos / Objectivos — CRUD + check-in diário.
 */
import { prisma } from "@/lib/db";
import type { Habit, HabitFrequency, HabitLog } from "@prisma/client";
import {
  endOfZonedDay,
  formatDayIso,
  shiftDayIso,
  startOfZonedDay,
  zonedDateTimeToUtc,
} from "@/lib/zoned-date";

export type HabitWithLogs = Habit & { logs: HabitLog[] };

export async function listHabits(
  userId: string,
  opts?: { includeInactive?: boolean },
): Promise<HabitWithLogs[]> {
  return prisma.habit.findMany({
    where: {
      userId,
      ...(opts?.includeInactive ? {} : { active: true }),
    },
    include: { logs: { orderBy: { doneAt: "desc" }, take: 30 } },
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
  });
}

export async function createHabit(input: {
  userId: string;
  title: string;
  description?: string;
  frequency?: HabitFrequency;
  targetPerWeek?: number;
  color?: string;
}) {
  return prisma.habit.create({
    data: {
      userId: input.userId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      frequency: input.frequency ?? "DAILY",
      targetPerWeek: input.targetPerWeek,
      color: input.color,
    },
  });
}

export async function updateHabit(
  userId: string,
  habitId: string,
  data: Partial<{
    title: string;
    description: string | null;
    frequency: HabitFrequency;
    targetPerWeek: number | null;
    color: string | null;
    active: boolean;
  }>,
) {
  const existing = await prisma.habit.findFirst({ where: { id: habitId, userId } });
  if (!existing) return null;
  return prisma.habit.update({ where: { id: habitId }, data });
}

export async function deleteHabit(userId: string, habitId: string) {
  const existing = await prisma.habit.findFirst({ where: { id: habitId, userId } });
  if (!existing) return false;
  await prisma.habit.delete({ where: { id: habitId } });
  return true;
}

export async function logHabit(habitId: string, userId: string) {
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
  if (!habit) return null;
  const start = startOfZonedDay(new Date());
  const end = endOfZonedDay(new Date());
  const existing = await prisma.habitLog.findFirst({
    where: { habitId, doneAt: { gte: start, lte: end } },
  });
  if (existing) return existing;
  return prisma.habitLog.create({ data: { habitId } });
}

/** Remove o check-in de hoje (Europe/Lisbon). */
export async function unlogHabitToday(habitId: string, userId: string) {
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
  if (!habit) return false;
  const result = await prisma.habitLog.deleteMany({
    where: {
      habitId,
      doneAt: {
        gte: startOfZonedDay(new Date()),
        lte: endOfZonedDay(new Date()),
      },
    },
  });
  return result.count > 0;
}

/** Já feito hoje (Europe/Lisbon)? */
export function loggedToday(habit: HabitWithLogs, now = new Date()): boolean {
  const start = startOfZonedDay(now).getTime();
  const end = endOfZonedDay(now).getTime();
  return habit.logs.some((l) => {
    const t = l.doneAt.getTime();
    return t >= start && t <= end;
  });
}

/** Check-ins na semana civil actual (Seg–Dom, Lisbon). */
export function logsThisWeek(habit: HabitWithLogs, now = new Date()): number {
  const iso = formatDayIso(now);
  const p = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)!;
  const y = Number(p[1]);
  const mo = Number(p[2]);
  const d = Number(p[3]);
  const jsDay = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
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
  ).getTime();
  const to = zonedDateTimeToUtc(
    Number(sundayIso.slice(0, 4)),
    Number(sundayIso.slice(5, 7)),
    Number(sundayIso.slice(8, 10)),
    23,
    59,
    59,
    999,
  ).getTime();
  return habit.logs.filter((l) => {
    const t = l.doneAt.getTime();
    return t >= from && t <= to;
  }).length;
}

export const habitsModule = {
  meta: { id: "HABITS" as const, label: "Objectivos", status: "active" as const },
  listHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  logHabit,
  unlogHabitToday,
  loggedToday,
  logsThisWeek,
};
