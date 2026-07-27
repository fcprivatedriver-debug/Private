import { requireUser } from "@/lib/session";
import { listTasks } from "@/modules/tasks/service";
import { TaskList } from "@/components/mel/TaskList";

export default async function TasksPage() {
  const { user } = await requireUser();
  const tasks = await listTasks(user.id);

  return (
    <div className="anim-rise">
      <h1 className="page-title">Tarefas</h1>
      <p className="page-lead">O que há para fazer — prioridades e prazos.</p>
      <TaskList initial={tasks} />
    </div>
  );
}
