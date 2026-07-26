import type { CalendarEventDraft, CalendarService } from "./types";
import { googleCalendarPrototype } from "./providers/google-prototype";

function tomorrow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
}

function formatSlot(d: Date) {
  return d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

export function createCalendarService(): CalendarService {
  const provider = googleCalendarPrototype;

  return {
    meta: {
      id: "calendar",
      label: "Calendário",
      health: "prototype",
      external: "Google Calendar / Apple / Outlook",
    },
    getProvider() {
      return provider;
    },
    async suggestAndPrepare(opts) {
      const day =
        opts.dayHint === "today"
          ? new Date()
          : opts.dayHint instanceof Date
            ? opts.dayHint
            : tomorrow();
      const duration = opts.durationMinutes ?? 60;
      const connected = await provider.isConnected();
      const freeSlots = await provider.findFreeSlots(day, duration);
      const dayLabel =
        opts.dayHint === "today"
          ? "hoje"
          : opts.dayHint === "tomorrow" || !opts.dayHint
            ? "amanhã"
            : day.toLocaleDateString("pt-PT");

      if (freeSlots.length === 0) {
        return {
          connected,
          authUrl: connected ? undefined : provider.authUrl(),
          freeSlots,
          reply: `Não encontrei espaço livre ${dayLabel} com ${duration} minutos. Queres que eu tente outro dia?`,
        };
      }

      const first = freeSlots[0];
      const last = freeSlots[freeSlots.length - 1];
      return {
        connected,
        authUrl: connected ? undefined : provider.authUrl(),
        freeSlots,
        reply: `Para «${opts.title}» ${dayLabel}, tens disponibilidade entre as ${formatSlot(first.start)} e as ${formatSlot(last.end)}. Diz a hora — por exemplo «marca para as 15».`,
      };
    },
    async confirmBooking(draft: CalendarEventDraft) {
      const res = await provider.createEvent(draft);
      if (!res.ok) return { reply: res.error };
      return {
        reply: `Perfeito 😊 Vou abrir o teu calendário com «${draft.title}» às ${formatSlot(draft.start)}. Confirma só o evento — a Nina não guarda uma cópia privada.`,
        deepLink: res.deepLink,
      };
    },
  };
}

export const calendarService = createCalendarService();
