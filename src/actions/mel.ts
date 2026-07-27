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

ensureMelCore();

function revalidateApp() {
  revalidatePath("/", "layout");
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
    dueAt: input.dueAt ? new Date(input.dueAt) : null,
    tags: input.tags,
  });
  revalidateApp();
  return { ok: true as const, task };
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
      dueAt: data.dueAt === undefined ? undefined : data.dueAt ? new Date(data.dueAt) : null,
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
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
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

export async function captureAction(utterance: string) {
  ensureMelCore();
  const { user } = await requireUser();
  const result = await routeUtterance(user.id, utterance);
  revalidateApp();
  return {
    ok: result.ok,
    reply: result.reply,
    intent: result.intent,
  };
}

export async function chatAction(message: string) {
  ensureMelCore();
  const { user } = await requireUser();
  const result = await routeUtterance(user.id, message);
  // Se o router não capturou (só perguntas/criação), fallback já está no router
  await saveExchange(user.id, message, result.reply);
  revalidateApp();
  return { ok: true as const, reply: result.reply };
}

export async function refreshWeeklyReportAction() {
  const { user } = await requireUser();
  const report = await getOrCreateCurrentReport(user.id);
  revalidateApp();
  return { ok: true as const, report };
}
