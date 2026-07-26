import type { ReminderDraft, ReminderProvider, ReminderService } from "./types";

/** Deep-link genérico + fallback de texto (protótipo). */
export const systemReminderPrototype: ReminderProvider = {
  id: "system",
  label: "Lembretes do sistema",
  async create(draft: ReminderDraft) {
    // iOS/Android não têm URL universal estável — devolvemos google tasks / calendar reminder style
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const end = new Date(draft.when.getTime() + 15 * 60_000);
    const deepLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(draft.title)}&dates=${fmt(draft.when)}/${fmt(end)}&details=${encodeURIComponent("Lembrete Nina")}`;
    return { ok: true as const, deepLink };
  },
};

export function createReminderService(): ReminderService {
  const provider = systemReminderPrototype;
  return {
    meta: {
      id: "reminders",
      label: "Lembretes",
      health: "prototype",
      external: "Calendário / lembretes do sistema",
    },
    async schedule(draft) {
      const res = await provider.create(draft);
      if (!res.ok) return { reply: res.error };
      const when = draft.when.toLocaleString("pt-PT", {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short",
      });
      return {
        reply: `Já está 😊 Lembro-te «${draft.title}» · ${when}. Abro o teu calendário/lembretes para confirmares.`,
        deepLink: res.deepLink,
      };
    },
  };
}

export const reminderService = createReminderService();
