/**
 * Sync tarefas → calendário via event bus (sem import directo tasks→calendar nos callers).
 */
import { onMelEvent } from "@/core/events";
import { invokeCapability } from "@/core/capabilities";
import { slotFromDueAt, taskExternalId } from "@/modules/calendar/service";

/** Preferência: ao concluir tarefa, remover evento (default) ou manter. */
export type CalendarSyncPrefs = {
  removeOnTaskDone: boolean;
};

const defaultPrefs: CalendarSyncPrefs = { removeOnTaskDone: true };

async function upsertTaskEvent(payload: {
  userId: string;
  taskId: string;
  title: string;
  dueAt: string | null;
  status: string;
}, prefs: CalendarSyncPrefs = defaultPrefs): Promise<void> {
  const externalId = taskExternalId(payload.taskId);
  const existing = await invokeCapability("calendar.findByExternalId", {
    userId: payload.userId,
    externalId,
  });

  if (payload.status === "DONE" || payload.status === "CANCELLED") {
    if (existing && prefs.removeOnTaskDone) {
      await invokeCapability("calendar.delete", {
        userId: payload.userId,
        eventId: existing.id,
      });
    }
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

  if (existing) {
    await invokeCapability("calendar.update", {
      userId: payload.userId,
      eventId: existing.id,
      data: {
        title: payload.title,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        allDay: slot.allDay,
        description: "Tarefa Mel",
      },
    });
    return;
  }

  await invokeCapability("calendar.create", {
    userId: payload.userId,
    title: payload.title,
    description: "Tarefa Mel",
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    allDay: slot.allDay,
    source: "task-sync",
    externalId,
    color: "#0F766E",
  });
}

let registered = false;

/** Prefs injectáveis por request (Definições / cookie). Default: remover ao concluir. */
let activePrefs: CalendarSyncPrefs = defaultPrefs;

export function setCalendarSyncPrefs(prefs: Partial<CalendarSyncPrefs>): void {
  activePrefs = { ...activePrefs, ...prefs };
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
  });
}
