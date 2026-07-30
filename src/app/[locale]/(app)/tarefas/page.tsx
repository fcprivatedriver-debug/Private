import { requireUser } from "@/lib/session";
import { listTasks } from "@/modules/tasks/service";
import { TaskList } from "@/components/mel/TaskList";
import { ensureMelCore } from "@/core/bootstrap";
import { ensureTasksSyncedToCalendar } from "@/modules/calendar/sync";

export default async function TasksPage() {
  ensureMelCore();
  const { user } = await requireUser();
  // Mantém calendário alinhado após edições anteriores / seed.
  await ensureTasksSyncedToCalendar(user.id);
  const tasks = await listTasks(user.id);

  return (
    <div className="anim-rise">
      <h1 className="page-title">Tarefas</h1>
      <p className="page-lead">O que há para fazer — prioridades e prazos. Com data, aparecem na Agenda.</p>
      <TaskList initial={tasks} />
    </div>
  );
}
