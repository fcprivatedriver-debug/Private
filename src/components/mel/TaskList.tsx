"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { createTaskAction, updateTaskAction, deleteTaskAction } from "@/actions/mel";
import type { Task, TaskPriority, TaskStatus } from "@prisma/client";
import { readMelPrefs } from "@/lib/mel-prefs";
import {
  notifyTaskForToday,
  scheduleTaskReminder,
  showToast,
} from "@/modules/notifications/client";

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

function toLocalInput(d: Date | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type Draft = {
  title: string;
  notes: string;
  priority: TaskPriority;
  dueAt: string;
  tags: string;
  status: TaskStatus;
};

function draftFromTask(task: Task): Draft {
  return {
    title: task.title,
    notes: task.notes || "",
    priority: task.priority,
    dueAt: toLocalInput(task.dueAt),
    tags: (task.tags || []).join(", "),
    status: task.status,
  };
}

export function TaskList({ initial }: { initial: Task[] }) {
  const [tasks, setTasks] = useState(initial);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [dueAt, setDueAt] = useState("");
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [baseline, setBaseline] = useState<Draft | null>(null);

  const dirty = useMemo(() => {
    if (!draft || !baseline) return false;
    return JSON.stringify(draft) !== JSON.stringify(baseline);
  }, [draft, baseline]);

  function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    startTransition(async () => {
      const res = await createTaskAction({
        title,
        priority,
        dueAt: dueAt || null,
      });
      if (res.ok && res.task) {
        setTasks((prev) => [res.task!, ...prev]);
        setTitle("");
        setDueAt("");
        if (res.task.dueAt) {
          const due = new Date(res.task.dueAt);
          if (res.notifyToday) {
            notifyTaskForToday(res.task.title, due);
          }
          const prefs = readMelPrefs();
          if (prefs.pushRemindersEnabled) {
            void scheduleTaskReminder({
              taskId: res.task.id,
              title: res.task.title,
              dueAt: due,
            });
          }
        } else {
          showToast({ title: "Tarefa criada", body: res.task.title, kind: "success" });
        }
      }
    });
  }

  function openEditor(task: Task) {
    if (editingId && dirty) {
      const ok = window.confirm(
        "Tens alterações por guardar. Queres descartá-las e abrir outra tarefa?",
      );
      if (!ok) return;
    }
    const d = draftFromTask(task);
    setEditingId(task.id);
    setDraft(d);
    setBaseline(d);
  }

  function cancelEdit() {
    if (dirty) {
      const ok = window.confirm("Descartar as alterações não guardadas?");
      if (!ok) return;
    }
    setEditingId(null);
    setDraft(null);
    setBaseline(null);
  }

  function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingId || !draft) return;
    if (!draft.title.trim()) return;
    const prefs = readMelPrefs();
    startTransition(async () => {
      const res = await updateTaskAction(
        editingId,
        {
          title: draft.title,
          notes: draft.notes || null,
          priority: draft.priority,
          dueAt: draft.dueAt || null,
          status: draft.status,
          tags: draft.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        },
        { removeCalendarOnTaskDone: prefs.removeCalendarOnTaskDone },
      );
      if (res.ok && res.task) {
        setTasks((prev) => prev.map((t) => (t.id === editingId ? res.task! : t)));
        setEditingId(null);
        setDraft(null);
        setBaseline(null);
        if (res.task.dueAt) {
          const due = new Date(res.task.dueAt);
          const now = new Date();
          const sameDay =
            due.getFullYear() === now.getFullYear() &&
            due.getMonth() === now.getMonth() &&
            due.getDate() === now.getDate();
          if (sameDay) notifyTaskForToday(res.task.title, due);
          if (prefs.pushRemindersEnabled) {
            void scheduleTaskReminder({
              taskId: res.task.id,
              title: res.task.title,
              dueAt: due,
            });
          }
        }
      }
    });
  }

  function toggleDone(task: Task) {
    const next = task.status === "DONE" ? "TODO" : "DONE";
    const prefs = readMelPrefs();
    startTransition(async () => {
      const res = await updateTaskAction(
        task.id,
        { status: next },
        { removeCalendarOnTaskDone: prefs.removeCalendarOnTaskDone },
      );
      if (res.ok && res.task) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? res.task! : t)));
        if (editingId === task.id) {
          const d = draftFromTask(res.task);
          setDraft(d);
          setBaseline(d);
        }
      }
    });
  }

  function remove(taskId: string) {
    startTransition(async () => {
      await deleteTaskAction(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (editingId === taskId) {
        setEditingId(null);
        setDraft(null);
        setBaseline(null);
      }
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
        <div className="field">
          <label htmlFor="task-due">Data / hora (agenda)</label>
          <input
            id="task-due"
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
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
              <li key={task.id} className="list-row task-row">
                <button
                  type="button"
                  className="task-hit"
                  onClick={() => openEditor(task)}
                  aria-expanded={editingId === task.id}
                >
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
                  ) : (
                    <p className="muted small" style={{ margin: "0.25rem 0 0" }}>
                      Toca para editar
                    </p>
                  )}
                </button>
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

      {editingId && draft ? (
        <form className="form-stack panel task-editor anim-rise" onSubmit={saveEdit}>
          <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Editar tarefa</h2>
          <div className="field">
            <label htmlFor="edit-title">Título</label>
            <input
              id="edit-title"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="edit-notes">Descrição</label>
            <textarea
              id="edit-notes"
              rows={3}
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="edit-due">Data / hora</label>
            <input
              id="edit-due"
              type="datetime-local"
              value={draft.dueAt}
              onChange={(e) => setDraft({ ...draft, dueAt: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="edit-priority">Prioridade</label>
            <select
              id="edit-priority"
              value={draft.priority}
              onChange={(e) =>
                setDraft({ ...draft, priority: e.target.value as TaskPriority })
              }
            >
              {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="edit-tags">Tags (separadas por vírgula)</label>
            <input
              id="edit-tags"
              value={draft.tags}
              onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
              placeholder="casa, trabalho"
            />
          </div>
          <div className="field">
            <label htmlFor="edit-status">Estado</label>
            <select
              id="edit-status"
              value={draft.status}
              onChange={(e) =>
                setDraft({ ...draft, status: e.target.value as TaskStatus })
              }
            >
              <option value="TODO">Pendente</option>
              <option value="IN_PROGRESS">Em progresso</option>
              <option value="DONE">Concluída</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
          </div>
          <div className="inline-actions">
            <button className="btn btn-primary" type="submit" disabled={pending || !dirty}>
              Guardar
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={cancelEdit}
              disabled={pending}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
