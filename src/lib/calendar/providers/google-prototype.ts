import type {
  CalendarEvent,
  CalendarEventDraft,
  CalendarProvider,
  CalendarSlot,
} from "../types";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/** Protótipo: simula calendário ocupado 9–12 e 14–15; gera deep-links Google. */
export const googleCalendarPrototype: CalendarProvider = {
  id: "google",
  label: "Google Calendar",
  async isConnected() {
    // Sem OAuth real ainda — health needs_auth, mas free slots funcionam em protótipo
    return false;
  },
  authUrl() {
    return "https://calendar.google.com/";
  },
  async listEvents(from, to) {
    const day = startOfDay(from);
    const busy: CalendarEvent[] = [
      {
        id: "busy-am",
        provider: "google",
        title: "Foco / trabalho",
        start: new Date(day.getTime() + 9 * 3600_000),
        end: new Date(day.getTime() + 12 * 3600_000),
      },
      {
        id: "busy-pm",
        provider: "google",
        title: "Reunião",
        start: new Date(day.getTime() + 14 * 3600_000),
        end: new Date(day.getTime() + 15 * 3600_000),
      },
    ];
    return busy.filter((e) => e.start < to && e.end > from);
  },
  async findFreeSlots(day, durationMinutes) {
    const base = startOfDay(day);
    const workStart = 9;
    const workEnd = 18;
    const busy = await this.listEvents(
      new Date(base.getTime() + workStart * 3600_000),
      new Date(base.getTime() + workEnd * 3600_000),
    );
    const slots: CalendarSlot[] = [];
    let cursor = workStart * 60;
    const endMin = workEnd * 60;
    const busyRanges = busy.map((e) => ({
      a: e.start.getHours() * 60 + e.start.getMinutes(),
      b: e.end.getHours() * 60 + e.end.getMinutes(),
    }));

    while (cursor + durationMinutes <= endMin) {
      const next = cursor + durationMinutes;
      const overlaps = busyRanges.some((r) => cursor < r.b && next > r.a);
      if (!overlaps) {
        slots.push({
          start: new Date(base.getTime() + cursor * 60_000),
          end: new Date(base.getTime() + next * 60_000),
        });
        cursor = next;
      } else {
        const block = busyRanges.find((r) => cursor < r.b && next > r.a);
        cursor = block ? block.b : cursor + 30;
      }
    }
    return slots;
  },
  async createEvent(draft: CalendarEventDraft) {
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: draft.title,
      dates: `${fmt(draft.start)}/${fmt(draft.end)}`,
      details: draft.notes || "Criado com a Nina",
      location: draft.location || "",
    });
    const deepLink = `https://calendar.google.com/calendar/render?${params.toString()}`;
    return {
      ok: true as const,
      deepLink,
      event: {
        ...draft,
        id: `gcal-${Date.now()}`,
        provider: "google" as const,
      },
    };
  },
};
