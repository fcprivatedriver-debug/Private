import { requireUser } from "@/lib/session";
import {
  getDayItems,
  getMonthSummary,
  getWeekItems,
  toAgendaDTO,
  type AgendaMode,
} from "@/modules/calendar/agenda";
import { AgendaBoard } from "@/modules/calendar/AgendaBoard";
import { ensureMelCore } from "@/core/bootstrap";
import { ensureTasksSyncedToCalendar } from "@/modules/calendar/sync";
import { formatDayIso, todayIso } from "@/lib/zoned-date";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; day?: string }>;
}) {
  ensureMelCore();
  const { user } = await requireUser();
  const sp = await searchParams;
  const mode = (["day", "week", "month"].includes(sp.mode || "")
    ? sp.mode
    : "day") as AgendaMode;
  const dayIso =
    sp.day && /^\d{4}-\d{2}-\d{2}$/.test(sp.day) ? sp.day : todayIso();
  const monthIso = `${dayIso.slice(0, 7)}-01`;

  // Garante eventos task-sync para tarefas com data (seed/legado/falhas).
  await ensureTasksSyncedToCalendar(user.id);

  const [dayItems, weekCols, monthSummaries] = await Promise.all([
    getDayItems(user.id, dayIso),
    getWeekItems(user.id, dayIso),
    getMonthSummary(user.id, monthIso),
  ]);

  return (
    <div className="anim-rise stack">
      <div>
        <h1 className="page-title">Agenda</h1>
        <p className="page-lead">
          Dia, semana e mês — tarefas com ou sem hora, e eventos no mesmo sítio.
        </p>
        <p className="muted small">Hoje (Lisboa): {formatDayIso(new Date())}</p>
      </div>
      <AgendaBoard
        initialMode={mode}
        initialDayIso={dayIso}
        dayItems={dayItems.map(toAgendaDTO)}
        weekColumns={weekCols.map((c) => ({
          dayIso: c.dayIso,
          label: c.label,
          items: c.items.map(toAgendaDTO),
        }))}
        monthSummaries={monthSummaries}
        monthIso={monthIso}
      />
    </div>
  );
}
