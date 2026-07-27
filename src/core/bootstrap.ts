/**
 * Bootstrap do core Mel — regista capabilities e sync calendário.
 * Importar uma vez no arranque de server actions / assistente.
 */
import { registerTasksCapabilities } from "@/modules/tasks/service";
import { registerCalendarCapabilities } from "@/modules/calendar/service";
import { registerVoiceCapabilities } from "@/modules/voice/service";
import { registerCalendarTaskSync } from "@/modules/calendar/sync";

let booted = false;

export function ensureMelCore(): void {
  if (booted) return;
  registerTasksCapabilities();
  registerCalendarCapabilities();
  registerVoiceCapabilities();
  registerCalendarTaskSync();
  booted = true;
}
