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

const TZ = "Europe/Lisbon";

function zonedParts(d: Date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    time: `${map.hour}:${map.minute}`,
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

function isUntimedClient(d: Date): boolean {
  const p = zonedParts(d);
  return (p.hour === 23 && p.minute >= 50) || (p.hour === 0 && p.minute === 0);
}

/** Valor enviado ao servidor: data só OU datetime-local. */
function composeDueValue(date: string, time: string, withTime: boolean): string | null {
  if (!date) return null;
  if (!withTime || !time) return date;
  return `${date}T${time}`;
}

type Draft = {
  title: string;
  notes: string;
  priority: TaskPriority;
  dueDate: string;
  dueTime: string;
  withTime: boolean;
  tags: string;
  status: TaskStatus;
};

function draftFromTask(task: Task): Draft {
  if (!task.dueAt) {
    return {
      title: task.title,
      notes: task.notes || "",
      priority: task.priority,
      dueDate: "",
      dueTime: "",
      withTime: false,
      tags: (task.tags || []).join(", "),
      status: task.status,
    };
  }
  const p = zonedParts(new Date(task.dueAt));
  const untimed = isUntimedClient(new Date(task.dueAt));
  return {
    title: task.title,
    notes: task.notes || "",
    priority: task.priority,
    dueDate: p.date,
    dueTime: untimed ? "" : p.time,
    withTime: !untimed,
    tags: (task.tags || []).join(", "),
    status: task.status,
  };
}

export function TaskList({ initial }: { initial: Task[] }) {
  const [tasks, setTasks] = useState(initial);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [withTime, setWithTime] = useState(false);
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
        dueAt: composeDueValue(dueDate, dueTime, withTime),
      });
      if (res.ok && res.task) {
        setTasks((prev) => [res.task!, ...prev]);
        setTitle("");
        setDueDate("");
        setDueTime("");
        setWithTime(false);
        if (res.task.dueAt) {
          const due = new Date(res.task.dueAt);
          if (res.notifyToday) {
            notifyTaskForToday(res.task.title, due);
          }
          const prefs = readMelPrefs();
          if (prefs.pushRemindersEnabled && withTime) {
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
          dueAt: composeDueValue(draft.dueDate, draft.dueTime, draft.withTime),
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
        if (res.task.dueAt && draft.withTime) {
          const due = new Date(res.task.dueAt);
          const today = zonedParts(new Date()).date;
          const dueDay = zonedParts(due).date;
          if (today === dueDay) notifyTaskForToday(res.task.title, due);
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
          <label htmlFor="task-due-date">Data (agenda)</label>
          <input
            id="task-due-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <label className="toggle-row" style={{ alignItems: "center" }}>
          <span className="small">Definir hora</span>
          <input
            className="switch"
            type="checkbox"
            checked={withTime}
            onChange={(e) => setWithTime(e.target.checked)}
            disabled={!dueDate}
          />
        </label>
        {withTime ? (
          <div className="field">
            <label htmlFor="task-due-time">Hora (opcional)</label>
            <input
              id="task-due-time"
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
            />
          </div>
        ) : (
          <p className="muted small">Sem hora — aparece como «todo o dia» na agenda.</p>
        )}
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
                      {isUntimedClient(new Date(task.dueAt))
                        ? `Dia ${zonedParts(new Date(task.dueAt)).date}`
                        : `Até ${new Date(task.dueAt).toLocaleString("pt-PT", {
                            timeZone: TZ,
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`}
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
            <label htmlFor="edit-due-date">Data</label>
            <input
              id="edit-due-date"
              type="date"
              value={draft.dueDate}
              onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
            />
          </div>
          <label className="toggle-row" style={{ alignItems: "center" }}>
            <span className="small">Definir hora</span>
            <input
              className="switch"
              type="checkbox"
              checked={draft.withTime}
              disabled={!draft.dueDate}
              onChange={(e) => setDraft({ ...draft, withTime: e.target.checked })}
            />
          </label>
          {draft.withTime ? (
            <div className="field">
              <label htmlFor="edit-due-time">Hora</label>
              <input
                id="edit-due-time"
                type="time"
                value={draft.dueTime}
                onChange={(e) => setDraft({ ...draft, dueTime: e.target.value })}
              />
            </div>
          ) : (
            <p className="muted small">Sem hora — bloco «todo o dia» na agenda.</p>
          )}
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
