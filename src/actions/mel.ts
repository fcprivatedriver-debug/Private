"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { DEFAULT_MODULE_IDS } from "@/modules/registry";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import { ensureMelCore } from "@/core/bootstrap";
import { invokeCapability } from "@/core/capabilities";
import { routeUtterance } from "@/core/router";
import { setCalendarSyncPrefs } from "@/modules/calendar/sync";
import { getOrCreateCurrentReport } from "@/modules/reports/service";
import { saveExchange } from "@/lib/ai/mel-assistant";
import {
  dueAtEndOfDayInZone,
  endOfZonedDay,
  parseDatetimeLocalInZone,
  startOfZonedDay,
} from "@/lib/zoned-date";

ensureMelCore();

function revalidateApp() {
  revalidatePath("/", "layout");
}

/** Converte input de data/hora do cliente → Date em Europe/Lisbon. */
function parseClientDueAt(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return dueAtEndOfDayInZone(value);
  }
  return parseDatetimeLocalInZone(value);
}

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

export async function registerUser(formData: FormData) {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false as const, error: "Dados inválidos. Verifica o formulário." };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false as const, error: "Já existe uma conta com este e-mail." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name.trim(),
      email,
      passwordHash,
      modules: {
        create: DEFAULT_MODULE_IDS.map((moduleId) => ({
          moduleId,
          enabled: true,
        })),
      },
    },
  });

  return { ok: true as const, userId: user.id };
}

export async function setBiometricsEnabled(enabled: boolean) {
  const { user } = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { biometricsEnabled: enabled },
  });
  revalidateApp();
  return { ok: true as const, biometricsEnabled: enabled };
}

export async function setPin(pin: string) {
  const { user } = await requireUser();
  if (!/^\d{4,8}$/.test(pin)) {
    return { ok: false as const, error: "O PIN deve ter entre 4 e 8 dígitos." };
  }
  const pinHash = await bcrypt.hash(pin, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { pinHash },
  });
  revalidateApp();
  return { ok: true as const };
}

export async function clearPin() {
  const { user } = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { pinHash: null },
  });
  revalidateApp();
  return { ok: true as const };
}

export async function createTaskAction(input: {
  title: string;
  notes?: string;
  priority?: TaskPriority;
  dueAt?: string | null;
  tags?: string[];
}) {
  ensureMelCore();
  const { user } = await requireUser();
  const title = input.title.trim();
  if (!title) return { ok: false as const, error: "Indica um título." };
  const task = await invokeCapability("tasks.create", {
    userId: user.id,
    title,
    notes: input.notes,
    priority: input.priority,
    dueAt: parseClientDueAt(input.dueAt ?? null) ?? null,
    tags: input.tags,
  });
  const due = task.dueAt ? new Date(task.dueAt) : null;
  const start = startOfZonedDay(new Date());
  const end = endOfZonedDay(new Date());
  revalidateApp();
  return {
    ok: true as const,
    task,
    notifyToday: Boolean(due && due >= start && due <= end),
  };
}

export async function updateTaskAction(
  taskId: string,
  data: {
    title?: string;
    notes?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueAt?: string | null;
    tags?: string[];
  },
  opts?: { removeCalendarOnTaskDone?: boolean },
) {
  ensureMelCore();
  if (typeof opts?.removeCalendarOnTaskDone === "boolean") {
    setCalendarSyncPrefs({ removeOnTaskDone: opts.removeCalendarOnTaskDone });
  }
  const { user } = await requireUser();
  const updated = await invokeCapability("tasks.update", {
    userId: user.id,
    taskId,
    data: {
      ...data,
      dueAt:
        data.dueAt === undefined ? undefined : parseClientDueAt(data.dueAt) ?? null,
    },
  });
  if (!updated) return { ok: false as const, error: "Tarefa não encontrada." };
  revalidateApp();
  return { ok: true as const, task: updated };
}

export async function deleteTaskAction(taskId: string) {
  ensureMelCore();
  const { user } = await requireUser();
  const ok = await invokeCapability("tasks.delete", { userId: user.id, taskId });
  revalidateApp();
  return { ok };
}

export async function createEventAction(input: {
  title: string;
  description?: string;
  location?: string;
  startsAt: string;
  endsAt: string;
  allDay?: boolean;
}) {
  ensureMelCore();
  const { user } = await requireUser();
  const title = input.title.trim();
  if (!title) return { ok: false as const, error: "Indica um título." };
  const startsAt =
    input.allDay && /^\d{4}-\d{2}-\d{2}/.test(input.startsAt)
      ? parseDatetimeLocalInZone(input.startsAt.slice(0, 10) + "T00:00")
      : parseDatetimeLocalInZone(input.startsAt) ?? new Date(input.startsAt);
  const endsAt =
    input.allDay && /^\d{4}-\d{2}-\d{2}/.test(input.endsAt || input.startsAt)
      ? dueAtEndOfDayInZone((input.endsAt || input.startsAt).slice(0, 10))
      : parseDatetimeLocalInZone(input.endsAt) ?? new Date(input.endsAt);
  if (!startsAt || !endsAt || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { ok: false as const, error: "Datas inválidas." };
  }
  const event = await invokeCapability("calendar.create", {
    userId: user.id,
    title,
    description: input.description,
    startsAt,
    endsAt,
    allDay: input.allDay,
  });
  revalidateApp();
  return { ok: true as const, event };
}

export async function deleteEventAction(eventId: string) {
  ensureMelCore();
  const { user } = await requireUser();
  const ok = await invokeCapability("calendar.delete", {
    userId: user.id,
    eventId,
  });
  revalidateApp();
  return { ok };
}

export async function updateEventAction(
  eventId: string,
  data: {
    title?: string;
    description?: string | null;
    startsAt?: string;
    endsAt?: string;
    allDay?: boolean;
  },
) {
  ensureMelCore();
  const { user } = await requireUser();
  const updated = await invokeCapability("calendar.update", {
    userId: user.id,
    eventId,
    data: {
      title: data.title,
      description: data.description,
      allDay: data.allDay,
      startsAt: data.startsAt
        ? parseDatetimeLocalInZone(data.startsAt) ?? new Date(data.startsAt)
        : undefined,
      endsAt: data.endsAt
        ? parseDatetimeLocalInZone(data.endsAt) ?? new Date(data.endsAt)
        : undefined,
    },
  });
  if (!updated) return { ok: false as const, error: "Evento não encontrado." };
  revalidateApp();
  return { ok: true as const, event: updated };
}

export async function captureAction(utterance: string) {
  ensureMelCore();
  const { user } = await requireUser();
  const result = await routeUtterance(user.id, utterance);
  revalidateApp();
  return {
    ok: result.ok,
    reply: result.reply,
    speakParts: result.speakParts,
    intent: result.intent,
  };
}

export async function chatAction(message: string) {
  ensureMelCore();
  const { user } = await requireUser();
  const result = await routeUtterance(user.id, message);
  await saveExchange(user.id, message, result.reply);
  revalidateApp();
  return {
    ok: true as const,
    reply: result.reply,
    speakParts: result.speakParts,
  };
}

export async function dayBriefingAction() {
  ensureMelCore();
  const { user } = await requireUser();
  const { getDayItems } = await import("@/modules/calendar/agenda");
  const { todayIso } = await import("@/lib/zoned-date");
  const {
    formatDayBriefingParts,
  } = await import("@/modules/voice/briefing");
  const items = await getDayItems(user.id, todayIso());
  const open = items.filter((i) => !i.done);
  const highOnly = open.filter(
    (i) => i.priority === "HIGH" || i.priority === "URGENT",
  );
  return {
    ok: true as const,
    count: open.length,
    parts: formatDayBriefingParts(open),
    highOnlyParts: formatDayBriefingParts(highOnly.length ? highOnly : open),
  };
}

export async function pendingBriefingAction(tag?: string) {
  ensureMelCore();
  const { user } = await requireUser();
  const tasks = await invokeCapability("tasks.list", {
    userId: user.id,
    filter: {
      status: ["TODO", "IN_PROGRESS"],
      sortBy: "dueAt",
      tag: tag || undefined,
      limit: 50,
    },
  });
  const { formatPendingParts } = await import("@/modules/voice/briefing");
  return {
    ok: true as const,
    parts: formatPendingParts(tasks, tag),
  };
}

export async function proposeOrganizeDayAction(opts?: {
  prefer?: "morning" | "afternoon";
  dayStartHour?: number;
}) {
  ensureMelCore();
  const { user } = await requireUser();
  const now = new Date();
  const tasks = await invokeCapability("tasks.list", {
    userId: user.id,
    filter: {
      dueAtDay: "today",
      status: ["TODO", "IN_PROGRESS"],
      sortBy: "priority",
      limit: 50,
    },
  });
  // Incluir também tarefas abertas sem dueAt (candidatas a agendar hoje)
  const openAll = await invokeCapability("tasks.list", {
    userId: user.id,
    filter: {
      status: ["TODO", "IN_PROGRESS"],
      sortBy: "priority",
      limit: 50,
    },
  });
  const byId = new Map(tasks.map((t) => [t.id, t]));
  for (const t of openAll) {
    if (!t.dueAt && !byId.has(t.id)) byId.set(t.id, t);
  }
  const merged = Array.from(byId.values());

  const { startOfZonedDay, endOfZonedDay } = await import("@/lib/zoned-date");
  const events = await invokeCapability("calendar.listRange", {
    userId: user.id,
    from: startOfZonedDay(now),
    to: endOfZonedDay(now),
  });

  const { buildDayPlan } = await import("@/modules/tasks/organize-day");
  const proposal = buildDayPlan(now, merged, events, {
    prefer: opts?.prefer,
    dayStartHour: opts?.dayStartHour,
  });
  return { ok: true as const, proposal };
}

export async function applyOrganizeDayAction(
  slots: import("@/modules/tasks/organize-day").DayPlanSlot[],
) {
  ensureMelCore();
  const { user } = await requireUser();
  const { planToTaskUpdates } = await import("@/modules/tasks/organize-day");
  const updates = planToTaskUpdates(slots);
  let updated = 0;
  for (const u of updates) {
    const task = await invokeCapability("tasks.update", {
      userId: user.id,
      taskId: u.taskId,
      data: { dueAt: u.dueAt },
    });
    if (task) updated += 1;
  }
  revalidateApp();
  return { ok: true as const, updated };
}

export async function createHabitAction(input: {
  title: string;
  description?: string;
  frequency?: "DAILY" | "WEEKLY" | "CUSTOM";
  targetPerWeek?: number;
}) {
  const { user } = await requireUser();
  const { createHabit } = await import("@/modules/habits/service");
  const habit = await createHabit({
    userId: user.id,
    title: input.title,
    description: input.description,
    frequency: input.frequency,
    targetPerWeek: input.targetPerWeek,
  });
  revalidateApp();
  return { ok: true as const, habit };
}

export async function updateHabitAction(
  habitId: string,
  data: {
    title?: string;
    description?: string | null;
    frequency?: "DAILY" | "WEEKLY" | "CUSTOM";
    targetPerWeek?: number | null;
    active?: boolean;
  },
) {
  const { user } = await requireUser();
  const { updateHabit } = await import("@/modules/habits/service");
  const habit = await updateHabit(user.id, habitId, data);
  if (!habit) return { ok: false as const, error: "Objectivo não encontrado." };
  revalidateApp();
  return { ok: true as const, habit };
}

export async function deleteHabitAction(habitId: string) {
  const { user } = await requireUser();
  const { deleteHabit } = await import("@/modules/habits/service");
  const ok = await deleteHabit(user.id, habitId);
  revalidateApp();
  return { ok };
}

export async function logHabitAction(habitId: string) {
  const { user } = await requireUser();
  const { logHabit } = await import("@/modules/habits/service");
  const log = await logHabit(habitId, user.id);
  if (!log) return { ok: false as const, error: "Objectivo não encontrado." };
  revalidateApp();
  return { ok: true as const, log };
}

export async function refreshWeeklyReportAction() {
  const { user } = await requireUser();
  const report = await getOrCreateCurrentReport(user.id);
  revalidateApp();
  return { ok: true as const, report };
}
