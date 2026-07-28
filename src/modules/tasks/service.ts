import type { Task, TaskPriority, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { emitMelEvent } from "@/core/events";
import { registerCapability, type TaskListFilter } from "@/core/capabilities";
import { startOfDay, endOfDay } from "date-fns";

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

const PRIORITY_ORDER: TaskPriority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];

export async function listTasks(
  userId: string,
  opts?: { status?: TaskStatus | TaskStatus[]; limit?: number },
): Promise<Task[]> {
  const statusFilter = opts?.status
    ? Array.isArray(opts.status)
      ? { in: opts.status }
      : opts.status
    : undefined;

  return prisma.task.findMany({
    where: {
      userId,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    take: opts?.limit ?? 100,
  });
}

export async function listTasksFiltered(
  userId: string,
  filter?: TaskListFilter,
): Promise<Task[]> {
  const now = new Date();
  const statusFilter = filter?.status
    ? Array.isArray(filter.status)
      ? { in: filter.status }
      : filter.status
    : undefined;

  const tasks = await prisma.task.findMany({
    where: {
      userId,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(filter?.dueAtDay === "today"
        ? { dueAt: { gte: startOfDay(now), lte: endOfDay(now) } }
        : {}),
      ...(filter?.dueAtDay === "open"
        ? {
            OR: [{ dueAt: { gte: startOfDay(now) } }, { dueAt: null }],
          }
        : {}),
      ...(filter?.tag
        ? { tags: { has: filter.tag } }
        : {}),
    },
    take: filter?.limit ?? 100,
  });

  if (filter?.sortBy === "priority") {
    return [...tasks].sort(
      (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority),
    );
  }
  if (filter?.sortBy === "dueAt") {
    return [...tasks].sort((a, b) => {
      const ta = a.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const tb = b.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return ta - tb;
    });
  }
  return tasks;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const task = await prisma.task.create({
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

  await emitMelEvent("task.created", {
    userId: task.userId,
    taskId: task.id,
    title: task.title,
    dueAt: task.dueAt?.toISOString() ?? null,
    priority: task.priority,
    status: task.status,
  });

  return task;
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

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...data,
      ...(completedAt !== undefined ? { completedAt } : {}),
    },
  });

  await emitMelEvent("task.updated", {
    userId: task.userId,
    taskId: task.id,
    title: task.title,
    dueAt: task.dueAt?.toISOString() ?? null,
    priority: task.priority,
    status: task.status,
    previousDueAt: existing.dueAt?.toISOString() ?? null,
    previousStatus: existing.status,
  });

  return task;
}

export async function deleteTask(userId: string, taskId: string): Promise<boolean> {
  const existing = await prisma.task.findFirst({ where: { id: taskId, userId } });
  if (!existing) return false;
  await prisma.task.delete({ where: { id: taskId } });
  await emitMelEvent("task.deleted", { userId, taskId });
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

export function registerTasksCapabilities(): void {
  registerCapability("tasks.list", async ({ userId, filter }) =>
    listTasksFiltered(userId, filter),
  );
  registerCapability("tasks.create", async (input) => createTask(input));
  registerCapability("tasks.update", async ({ userId, taskId, data }) =>
    updateTask(userId, taskId, data),
  );
  registerCapability("tasks.delete", async ({ userId, taskId }) =>
    deleteTask(userId, taskId),
  );
}

export const tasksModule = {
  meta: { id: "TASKS" as const, label: "Tarefas" },
  listTasks,
  listTasksFiltered,
  createTask,
  updateTask,
  deleteTask,
  tasksDueThisWeek,
  registerTasksCapabilities,
};
