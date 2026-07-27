"use client";

import { FormEvent, useState, useTransition } from "react";
import { createTaskAction, updateTaskAction, deleteTaskAction } from "@/actions/mel";
import type { Task, TaskPriority } from "@prisma/client";

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export function TaskList({ initial }: { initial: Task[] }) {
  const [tasks, setTasks] = useState(initial);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [pending, startTransition] = useTransition();

  function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    startTransition(async () => {
      const res = await createTaskAction({ title, priority });
      if (res.ok && res.task) {
        setTasks((prev) => [res.task!, ...prev]);
        setTitle("");
      }
    });
  }

  function toggleDone(task: Task) {
    const next = task.status === "DONE" ? "TODO" : "DONE";
    startTransition(async () => {
      const res = await updateTaskAction(task.id, { status: next });
      if (res.ok && res.task) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? res.task! : t)));
      }
    });
  }

  function remove(taskId: string) {
    startTransition(async () => {
      await deleteTaskAction(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    });
  }

  return (
    <div className="stack">
      <form className="form-stack panel" onSubmit={onCreate}>
        <div className="field">
          <label htmlFor="task-title">Nova tarefa</label>
          <input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Comprar pão"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="task-priority">Prioridade</label>
          <select
            id="task-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
          >
            {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          Adicionar
        </button>
      </form>

      <div className="panel">
        {tasks.length === 0 ? (
          <p className="muted">Nenhuma tarefa por agora.</p>
        ) : (
          <ul className="list-plain">
            {tasks.map((task) => (
              <li key={task.id} className="list-row">
                <div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <strong
                      style={{
                        textDecoration: task.status === "DONE" ? "line-through" : undefined,
                        opacity: task.status === "DONE" ? 0.65 : 1,
                      }}
                    >
                      {task.title}
                    </strong>
                    <span
                      className={`badge ${
                        task.status === "DONE"
                          ? "badge-done"
                          : task.priority === "HIGH" || task.priority === "URGENT"
                            ? "badge-high"
                            : ""
                      }`}
                    >
                      {task.status === "DONE" ? "Feita" : PRIORITY_LABEL[task.priority]}
                    </span>
                  </div>
                  {task.dueAt ? (
                    <p className="muted small" style={{ margin: "0.25rem 0 0" }}>
                      Até{" "}
                      {new Date(task.dueAt).toLocaleString("pt-PT", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  ) : null}
                </div>
                <div className="inline-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => toggleDone(task)}
                    disabled={pending}
                  >
                    {task.status === "DONE" ? "Reabrir" : "Concluir"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => remove(task.id)}
                    disabled={pending}
                  >
                    Apagar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
