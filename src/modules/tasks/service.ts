import type { Task, TaskPriority, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export type CreateTaskInput = {
  userId: string;
  title: string;
  notes?: string;
  priority?: TaskPriority;
  dueAt?: Date | null;
  source?: string;
  tags?: string[];
};

export type UpdateTaskInput = Partial<{
  title: string;
  notes: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: Date | null;
  tags: string[];
}>;

export async function listTasks(
  userId: string,
  opts?: { status?: TaskStatus; limit?: number },
): Promise<Task[]> {
  return prisma.task.findMany({
    where: {
      userId,
      ...(opts?.status ? { status: opts.status } : {}),
    },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    take: opts?.limit ?? 100,
  });
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  return prisma.task.create({
    data: {
      userId: input.userId,
      title: input.title.trim(),
      notes: input.notes?.trim() || null,
      priority: input.priority ?? "MEDIUM",
      dueAt: input.dueAt ?? null,
      source: input.source ?? "manual",
      tags: input.tags ?? [],
    },
  });
}

export async function updateTask(
  userId: string,
  taskId: string,
  data: UpdateTaskInput,
): Promise<Task | null> {
  const existing = await prisma.task.findFirst({ where: { id: taskId, userId } });
  if (!existing) return null;

  let completedAt: Date | null | undefined = undefined;
  if (data.status === "DONE") {
    completedAt = new Date();
  } else if (data.status) {
    completedAt = null;
  }

  return prisma.task.update({
    where: { id: taskId },
    data: {
      ...data,
      ...(completedAt !== undefined ? { completedAt } : {}),
    },
  });
}

export async function deleteTask(userId: string, taskId: string): Promise<boolean> {
  const existing = await prisma.task.findFirst({ where: { id: taskId, userId } });
  if (!existing) return false;
  await prisma.task.delete({ where: { id: taskId } });
  return true;
}

export async function tasksDueThisWeek(userId: string) {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + (7 - end.getDay()));
  end.setHours(23, 59, 59, 999);

  return prisma.task.findMany({
    where: {
      userId,
      status: { in: ["TODO", "IN_PROGRESS"] },
      OR: [{ dueAt: { lte: end } }, { dueAt: null }],
    },
    orderBy: [{ dueAt: "asc" }, { priority: "desc" }],
  });
}

export const tasksModule = {
  meta: { id: "TASKS" as const, label: "Tarefas" },
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  tasksDueThisWeek,
};
