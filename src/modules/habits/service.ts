/**
 * Módulo Hábitos / Objectivos — CRUD + check-in diário.
 */
import { prisma } from "@/lib/db";
import type { Habit, HabitFrequency, HabitLog } from "@prisma/client";
import { endOfZonedDay, startOfZonedDay } from "@/lib/zoned-date";

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
  return prisma.habitLog.create({ data: { habitId } });
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

export const habitsModule = {
  meta: { id: "HABITS" as const, label: "Objectivos", status: "active" as const },
  listHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  logHabit,
  loggedToday,
};
