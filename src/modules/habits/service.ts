/**
 * Módulo Hábitos — estrutura pronta para activação futura.
 * Sem acoplamento ao core: basta ligar `status: "active"` no registry.
 */
import { prisma } from "@/lib/db";
import type { HabitFrequency } from "@prisma/client";

export async function listHabits(userId: string) {
  return prisma.habit.findMany({
    where: { userId, active: true },
    include: { logs: { orderBy: { doneAt: "desc" }, take: 14 } },
    orderBy: { createdAt: "asc" },
  });
}

export async function createHabit(input: {
  userId: string;
  title: string;
  frequency?: HabitFrequency;
  targetPerWeek?: number;
}) {
  return prisma.habit.create({
    data: {
      userId: input.userId,
      title: input.title.trim(),
      frequency: input.frequency ?? "DAILY",
      targetPerWeek: input.targetPerWeek,
    },
  });
}

export async function logHabit(habitId: string, userId: string) {
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
  if (!habit) return null;
  return prisma.habitLog.create({ data: { habitId } });
}

export const habitsModule = {
  meta: { id: "HABITS" as const, label: "Hábitos", status: "coming_soon" as const },
  listHabits,
  createHabit,
  logHabit,
};
