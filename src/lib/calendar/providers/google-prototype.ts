import type { CalendarEventDraft, CalendarProvider } from "../types";

/** Google Calendar: deep-links reais; sem OAuth = sem eventos/slots inventados. */
export const googleCalendarPrototype: CalendarProvider = {
  id: "google",
  label: "Google Calendar",
  async isConnected() {
    return false;
  },
  authUrl() {
    return "https://calendar.google.com/";
  },
  async listEvents() {
    return [];
  },
  async findFreeSlots() {
    return [];
  },
  async createEvent(draft: CalendarEventDraft) {
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: draft.title,
      dates: `${fmt(draft.start)}/${fmt(draft.end)}`,
      details: draft.notes || "Criado com a addYknow / MEL",
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
