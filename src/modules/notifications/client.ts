/**
 * Notificações in-app + Web Notification (sem VAPID / push server).
 * Lembretes 15 min antes via SW setTimeout + rehidratación ao abrir a app.
 */

export type ToastKind = "info" | "success" | "warn";

export type ToastPayload = {
  id: string;
  title: string;
  body?: string;
  kind?: ToastKind;
};

type ToastListener = (t: ToastPayload) => void;

const toastListeners = new Set<ToastListener>();

export function subscribeToasts(fn: ToastListener): () => void {
  toastListeners.add(fn);
  return () => toastListeners.delete(fn);
}

export function showToast(input: Omit<ToastPayload, "id"> & { id?: string }): void {
  const payload: ToastPayload = {
    id: input.id || `t-${Date.now()}`,
    title: input.title,
    body: input.body,
    kind: input.kind || "info",
  };
  toastListeners.forEach((fn) => fn(payload));
}

const REMINDERS_KEY = "mel.reminders.v1";

export type LocalReminder = {
  id: string;
  title: string;
  dueAt: number;
  fireAt: number;
};

function readReminders(): LocalReminder[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(REMINDERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeReminders(list: LocalReminder[]): void {
  window.localStorage.setItem(REMINDERS_KEY, JSON.stringify(list));
}

export async function ensureNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Agenda lembrete local 15 min antes (SW se disponível; senão setTimeout na página). */
export async function scheduleTaskReminder(opts: {
  taskId: string;
  title: string;
  dueAt: Date;
  minutesBefore?: number;
}): Promise<void> {
  const minutes = opts.minutesBefore ?? 15;
  const fireAt = opts.dueAt.getTime() - minutes * 60 * 1000;
  if (fireAt <= Date.now()) return;

  const reminder: LocalReminder = {
    id: `task:${opts.taskId}`,
    title: opts.title,
    dueAt: opts.dueAt.getTime(),
    fireAt,
  };
  const list = readReminders().filter((r) => r.id !== reminder.id);
  list.push(reminder);
  writeReminders(list);

  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const reg = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
  if (reg?.active) {
    reg.active.postMessage({
      type: "SCHEDULE_REMINDER",
      id: reminder.id,
      title: "Mel — lembrete",
      body: `${opts.title} daqui a ${minutes} minutos`,
      fireAt: reminder.fireAt,
    });
    return;
  }

  const delay = fireAt - Date.now();
  window.setTimeout(() => {
    try {
      new Notification("Mel — lembrete", {
        body: `${opts.title} daqui a ${minutes} minutos`,
        tag: reminder.id,
      });
    } catch {
      /* ignore */
    }
  }, delay);
}

/** Ao abrir a app: re-agenda lembretes futuros e limpa passados. */
export async function rehydrateReminders(): Promise<void> {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const list = readReminders().filter((r) => r.fireAt > now - 60_000);
  writeReminders(list);
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const reg = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
  for (const r of list) {
    if (r.fireAt <= now) {
      try {
        if (reg) {
          await reg.showNotification("Mel — lembrete", {
            body: r.title,
            tag: r.id,
          });
        } else {
          new Notification("Mel — lembrete", { body: r.title, tag: r.id });
        }
      } catch {
        /* ignore */
      }
      continue;
    }
    if (reg?.active) {
      reg.active.postMessage({
        type: "SCHEDULE_REMINDER",
        id: r.id,
        title: "Mel — lembrete",
        body: `${r.title} em breve`,
        fireAt: r.fireAt,
      });
    }
  }
}

export function notifyTaskForToday(title: string, dueAt: Date): void {
  const now = new Date();
  const sameDay =
    dueAt.getFullYear() === now.getFullYear() &&
    dueAt.getMonth() === now.getMonth() &&
    dueAt.getDate() === now.getDate();
  if (!sameDay) return;
  const when = dueAt.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
  showToast({
    title: "Tarefa para hoje",
    body: `«${title}» às ${when}`,
    kind: "info",
  });
}
