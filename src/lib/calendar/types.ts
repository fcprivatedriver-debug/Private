import type { ServiceMeta } from "../services/types";

/**
 * Calendar Service — NUNCA cria calendário privado da Nina.
 * Integra com o calendário do utilizador (Google / Apple / Outlook).
 */

export type CalendarProviderId = "google" | "apple" | "outlook";

export type CalendarSlot = {
  start: Date;
  end: Date;
};

export type CalendarEventDraft = {
  title: string;
  start: Date;
  end: Date;
  location?: string;
  notes?: string;
};

export type CalendarEvent = CalendarEventDraft & {
  id: string;
  provider: CalendarProviderId;
};

export interface CalendarProvider {
  id: CalendarProviderId;
  label: string;
  /** true se o utilizador já autorizou */
  isConnected(): Promise<boolean>;
  /** URL OAuth / deep-link para autorizar */
  authUrl(): string;
  listEvents(from: Date, to: Date): Promise<CalendarEvent[]>;
  findFreeSlots(day: Date, durationMinutes: number): Promise<CalendarSlot[]>;
  createEvent(draft: CalendarEventDraft): Promise<{ ok: true; deepLink: string; event: CalendarEvent } | { ok: false; error: string }>;
}

export interface CalendarService {
  meta: ServiceMeta;
  getProvider(id?: CalendarProviderId): CalendarProvider;
  suggestAndPrepare(opts: {
    title: string;
    dayHint?: "today" | "tomorrow" | Date;
    durationMinutes?: number;
    preferredHour?: number;
  }): Promise<{
    connected: boolean;
    authUrl?: string;
    freeSlots: CalendarSlot[];
    reply: string;
  }>;
  confirmBooking(draft: CalendarEventDraft): Promise<{ reply: string; deepLink?: string }>;
}
