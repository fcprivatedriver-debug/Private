import type { ServiceMeta } from "../services/types";

/**
 * Reminder Service — usa o sistema do utilizador sempre que possível.
 * Sem duplicar apps de lembretes.
 */

export type ReminderDraft = {
  title: string;
  when: Date;
};

export interface ReminderProvider {
  id: string;
  label: string;
  create(draft: ReminderDraft): Promise<{ ok: true; deepLink?: string } | { ok: false; error: string }>;
}

export interface ReminderService {
  meta: ServiceMeta;
  schedule(draft: ReminderDraft): Promise<{ reply: string; deepLink?: string }>;
}
