/**
 * Módulo Lembretes — estrutura pronta para activação futura.
 */
import { prisma } from "@/lib/db";

export async function listUpcomingReminders(userId: string, limit = 20) {
  return prisma.reminder.findMany({
    where: { userId, status: "SCHEDULED", remindAt: { gte: new Date() } },
    orderBy: { remindAt: "asc" },
    take: limit,
  });
}

export async function createReminder(input: {
  userId: string;
  title: string;
  body?: string;
  remindAt: Date;
  source?: string;
}) {
  return prisma.reminder.create({
    data: {
      userId: input.userId,
      title: input.title.trim(),
      body: input.body?.trim() || null,
      remindAt: input.remindAt,
      source: input.source ?? "manual",
    },
  });
}

export async function dismissReminder(userId: string, id: string) {
  const existing = await prisma.reminder.findFirst({ where: { id, userId } });
  if (!existing) return null;
  return prisma.reminder.update({
    where: { id },
    data: { status: "DISMISSED" },
  });
}

export const remindersModule = {
  meta: {
    id: "REMINDERS" as const,
    label: "Lembretes",
    status: "coming_soon" as const,
  },
  listUpcomingReminders,
  createReminder,
  dismissReminder,
};
