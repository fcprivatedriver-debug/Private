/**
 * Sync tarefas → calendário via event bus (sem import directo tasks→calendar nos callers).
 * Default ao concluir: marcar evento como concluído (riscado), não remover.
 */
import { onMelEvent } from "@/core/events";
import { invokeCapability } from "@/core/capabilities";
import { prisma } from "@/lib/db";
import { slotFromDueAt, taskExternalId } from "@/modules/calendar/service";
import {
  buildTaskEventDescription,
  doneColor,
  priorityColor,
} from "@/modules/calendar/markers";

/** Preferência: ao concluir, remover evento OU marcar como concluído. */
export type CalendarSyncPrefs = {
  /** true = apagar da agenda; false = marcar concluído (default). */
  removeOnTaskDone: boolean;
};

const defaultPrefs: CalendarSyncPrefs = { removeOnTaskDone: false };

export async function upsertTaskEvent(
  payload: {
    userId: string;
    taskId: string;
    title: string;
    dueAt: string | null;
    priority?: string;
    status: string;
  },
  prefs: CalendarSyncPrefs = defaultPrefs,
): Promise<void> {
  try {
    const externalId = taskExternalId(payload.taskId);
    const existing = await invokeCapability("calendar.findByExternalId", {
      userId: payload.userId,
      externalId,
    });
    const priority = payload.priority || "MEDIUM";

    if (payload.status === "CANCELLED") {
      if (existing) {
        await invokeCapability("calendar.delete", {
          userId: payload.userId,
          eventId: existing.id,
        });
      }
      return;
    }

    if (payload.status === "DONE") {
      if (existing && prefs.removeOnTaskDone) {
        await invokeCapability("calendar.delete", {
          userId: payload.userId,
          eventId: existing.id,
        });
        return;
      }

      if (!payload.dueAt) {
        if (existing) {
          await invokeCapability("calendar.delete", {
            userId: payload.userId,
            eventId: existing.id,
          });
        }
        return;
      }

      const due = new Date(payload.dueAt);
      const slot = slotFromDueAt(due);
      const description = buildTaskEventDescription({
        taskId: payload.taskId,
        priority,
        status: "DONE",
      });
      if (existing) {
        await invokeCapability("calendar.update", {
          userId: payload.userId,
          eventId: existing.id,
          data: {
            title: payload.title,
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
            allDay: slot.allDay,
            description,
            color: doneColor(),
          },
        });
        return;
      }
      await invokeCapability("calendar.create", {
        userId: payload.userId,
        title: payload.title,
        description,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        allDay: slot.allDay,
        source: "task-sync",
        externalId,
        color: doneColor(),
      });
      return;
    }

    if (!payload.dueAt) {
      if (existing) {
        await invokeCapability("calendar.delete", {
          userId: payload.userId,
          eventId: existing.id,
        });
      }
      return;
    }

    const due = new Date(payload.dueAt);
    const slot = slotFromDueAt(due);
    const description = buildTaskEventDescription({
      taskId: payload.taskId,
      priority,
      status: "OPEN",
    });
    const color = priorityColor(priority);

    if (existing) {
      await invokeCapability("calendar.update", {
        userId: payload.userId,
        eventId: existing.id,
        data: {
          title: payload.title,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          allDay: slot.allDay,
          description,
          color,
        },
      });
      return;
    }

    await invokeCapability("calendar.create", {
      userId: payload.userId,
      title: payload.title,
      description,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      allDay: slot.allDay,
      source: "task-sync",
      externalId,
      color,
    });
  } catch (err) {
    console.error("[mel] sync tarefa→calendário falhou", err);
  }
}

/**
 * Reconcilia todas as tarefas do utilizador com eventos `task-sync`.
 * Corrige seed/legado e falhas silenciosas do event bus.
 */
export async function ensureTasksSyncedToCalendar(userId: string): Promise<number> {
  const tasks = await prisma.task.findMany({ where: { userId } });
  const synced = await prisma.calendarEvent.findMany({
    where: {
      userId,
      OR: [{ source: "task-sync" }, { externalId: { startsWith: "task:" } }],
    },
    select: { id: true, externalId: true },
  });

  let touched = 0;
  for (const task of tasks) {
    await upsertTaskEvent({
      userId,
      taskId: task.id,
      title: task.title,
      dueAt: task.dueAt?.toISOString() ?? null,
      priority: task.priority,
      status: task.status,
    });
    touched += 1;
  }

  const living = new Set(tasks.map((t) => taskExternalId(t.id)));
  for (const ev of synced) {
    if (!ev.externalId || living.has(ev.externalId)) continue;
    try {
      await invokeCapability("calendar.delete", {
        userId,
        eventId: ev.id,
      });
    } catch (err) {
      console.error("[mel] limpeza órfão calendário falhou", err);
    }
  }

  return touched;
}

let registered = false;
let activePrefs: CalendarSyncPrefs = { ...defaultPrefs };

export function setCalendarSyncPrefs(prefs: Partial<CalendarSyncPrefs>): void {
  activePrefs = { ...activePrefs, ...prefs };
}

export function getCalendarSyncPrefs(): CalendarSyncPrefs {
  return { ...activePrefs };
}

export function registerCalendarTaskSync(): void {
  if (registered) return;
  registered = true;

  onMelEvent("task.created", async (payload) => {
    await upsertTaskEvent(payload, activePrefs);
  });

  onMelEvent("task.updated", async (payload) => {
    await upsertTaskEvent(payload, activePrefs);
  });

  onMelEvent("task.deleted", async (payload) => {
    try {
      const existing = await invokeCapability("calendar.findByExternalId", {
        userId: payload.userId,
        externalId: taskExternalId(payload.taskId),
      });
      if (existing) {
        await invokeCapability("calendar.delete", {
          userId: payload.userId,
          eventId: existing.id,
        });
      }
    } catch (err) {
      console.error("[mel] sync delete calendário falhou", err);
    }
  });
}
