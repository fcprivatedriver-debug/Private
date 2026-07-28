import { requireUser } from "@/lib/session";
import {
  getDayItems,
  getMonthSummary,
  getWeekItems,
  toAgendaDTO,
  type AgendaMode,
} from "@/modules/calendar/agenda";
import { AgendaBoard } from "@/modules/calendar/AgendaBoard";
import { format, parseISO, startOfMonth } from "date-fns";
import { ensureMelCore } from "@/core/bootstrap";

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
  const rawDay = sp.day ? parseISO(sp.day) : new Date();
  const day = Number.isNaN(rawDay.getTime()) ? new Date() : rawDay;

  const [dayItems, weekCols, monthSummaries] = await Promise.all([
    getDayItems(user.id, day),
    getWeekItems(user.id, day),
    getMonthSummary(user.id, startOfMonth(day)),
  ]);

  return (
    <div className="anim-rise stack">
      <div>
        <h1 className="page-title">Agenda</h1>
        <p className="page-lead">
          Dia, semana e mês — tarefas com hora e eventos no mesmo sítio.
        </p>
      </div>
      <AgendaBoard
        initialMode={mode}
        initialDayIso={format(day, "yyyy-MM-dd")}
        dayItems={dayItems.map(toAgendaDTO)}
        weekColumns={weekCols.map((c) => ({
          dayIso: format(c.day, "yyyy-MM-dd"),
          label: c.label,
          items: c.items.map(toAgendaDTO),
        }))}
        monthSummaries={monthSummaries}
        monthIso={format(startOfMonth(day), "yyyy-MM-dd")}
      />
    </div>
  );
}
