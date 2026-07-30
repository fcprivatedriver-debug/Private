/**
 * Bootstrap do core Mel — regista capabilities e sync calendário.
 */
import { registerTasksCapabilities } from "@/modules/tasks/service";
import { registerCalendarCapabilities } from "@/modules/calendar/service";
import { registerAgendaCapabilities } from "@/modules/calendar/agenda";
import { registerVoiceCapabilities } from "@/modules/voice/service";
import { registerCalendarTaskSync } from "@/modules/calendar/sync";

let booted = false;

export function ensureMelCore(): void {
  if (booted) return;
  registerTasksCapabilities();
  registerCalendarCapabilities();
  registerAgendaCapabilities();
  registerVoiceCapabilities();
  registerCalendarTaskSync();
  booted = true;
}
