import { requireUser } from "@/lib/session";
import { listTasks } from "@/modules/tasks/service";
import { listToday } from "@/modules/calendar/service";
import { recentMessages } from "@/lib/ai/mel-assistant";
import { MelChat } from "@/components/mel/MelChat";
import { SpeakButton } from "@/components/mel/SpeakButton";
import { ListenDayButtons } from "@/components/mel/ListenDayButtons";
import { OrganizeDayPanel } from "@/components/mel/OrganizeDayPanel";
import { TodayCountBanner } from "@/components/mel/TodayCountBanner";
import Link from "next/link";
import { startOfDay } from "date-fns";

export default async function TodayPage() {
  const { user } = await requireUser();
  const [tasks, events, messages] = await Promise.all([
    listTasks(user.id, { limit: 100 }),
    listToday(user.id),
    recentMessages(user.id, 8),
  ]);

  const open = tasks.filter((t) => t.status !== "DONE" && t.status !== "CANCELLED");
  const start = startOfDay(new Date());
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  const todayOpen = open.filter(
    (t) => t.dueAt && t.dueAt >= start && t.dueAt <= end,
  );
  const overdue = open.filter((t) => t.dueAt && t.dueAt < start);
  const firstName = user.name.split(" ")[0] || user.name;

  return (
    <div className="stack anim-rise">
      <div>
        <h1 className="page-title">Olá, {firstName}</h1>
        <p className="page-lead">Aqui está o teu dia com a Mel.</p>
        <TodayCountBanner
          todayCount={todayOpen.length}
          overdueCount={overdue.length}
        />
      </div>

      <ListenDayButtons />

      <OrganizeDayPanel />

      <div className="metrics-grid">
        <div className="panel metric">
          <span className="muted small">Tarefas abertas</span>
          <strong>{open.length}</strong>
        </div>
        <div className="panel metric">
          <span className="muted small">Eventos hoje</span>
          <strong>{events.length}</strong>
        </div>
        <div className="panel metric">
          <span className="muted small">Feitas</span>
          <strong>{tasks.filter((t) => t.status === "DONE").length}</strong>
        </div>
        <div className="panel metric">
          <span className="muted small">Atalho</span>
          <div style={{ marginTop: "0.35rem" }}>
            <SpeakButton compact label="Falar" />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="toggle-row">
          <h2 style={{ margin: 0 }}>Agenda de hoje</h2>
          <Link href="/pt/agenda?mode=day" className="btn btn-ghost btn-sm">
            Ver agenda
          </Link>
        </div>
        {events.length === 0 ? (
          <p className="muted">Sem compromissos — dia livre.</p>
        ) : (
          <ul className="list-plain">
            {events.map((e) => (
              <li key={e.id} className="list-row">
                <div>
                  <strong
                    style={{
                      textDecoration: e.description?.includes("status=DONE")
                        ? "line-through"
                        : undefined,
                      opacity: e.description?.includes("status=DONE") ? 0.65 : 1,
                    }}
                  >
                    {e.title}
                  </strong>
                  <p className="muted small" style={{ margin: "0.2rem 0 0" }}>
                    {e.allDay
                      ? "Todo o dia"
                      : e.startsAt.toLocaleTimeString("pt-PT", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                    {e.location ? ` · ${e.location}` : ""}
                    {e.source === "task-sync" ? " · tarefa" : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel">
        <h2>Em aberto</h2>
        {open.length === 0 ? (
          <p className="muted">Nada pendente. Bom trabalho.</p>
        ) : (
          <ul className="list-plain">
            {open.slice(0, 5).map((t) => (
              <li key={t.id} className="list-row">
                <strong>{t.title}</strong>
                <span className="badge">{t.priority}</span>
              </li>
            ))}
          </ul>
        )}
        <div style={{ marginTop: "0.75rem" }}>
          <Link href="/pt/tarefas" className="btn btn-ghost btn-sm">
            Ver todas
          </Link>
        </div>
      </div>

      <MelChat
        initial={messages.map((m) => ({
          role: m.role as "USER" | "ASSISTANT",
          content: m.content,
        }))}
      />
    </div>
  );
}
