"use client";

import { FormEvent, useState, useTransition } from "react";
import type { Habit, HabitFrequency, HabitLog } from "@prisma/client";
import {
  createHabitAction,
  updateHabitAction,
  deleteHabitAction,
  logHabitAction,
  unlogHabitAction,
} from "@/actions/mel";

type HabitRow = Habit & {
  logs: HabitLog[];
  doneToday: boolean;
  weekCount: number;
};

const FREQ: Record<HabitFrequency, string> = {
  DAILY: "Diário",
  WEEKLY: "Semanal",
  CUSTOM: "Personalizado",
};

export function ObjectivesPanel({ initial }: { initial: HabitRow[] }) {
  const [habits, setHabits] = useState(initial);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<HabitFrequency>("DAILY");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editFreq, setEditFreq] = useState<HabitFrequency>("DAILY");
  const [pending, startTransition] = useTransition();

  function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    startTransition(async () => {
      const res = await createHabitAction({
        title,
        description: description || undefined,
        frequency,
        targetPerWeek: frequency === "DAILY" ? 7 : frequency === "WEEKLY" ? 1 : undefined,
      });
      if (res.ok && res.habit) {
        setHabits((prev) => [
          { ...res.habit!, logs: [], doneToday: false, weekCount: 0 },
          ...prev,
        ]);
        setTitle("");
        setDescription("");
        setFrequency("DAILY");
      }
    });
  }

  function startEdit(h: HabitRow) {
    setEditingId(h.id);
    setEditTitle(h.title);
    setEditDesc(h.description || "");
    setEditFreq(h.frequency);
  }

  function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    startTransition(async () => {
      const res = await updateHabitAction(editingId, {
        title: editTitle,
        description: editDesc || null,
        frequency: editFreq,
        targetPerWeek:
          editFreq === "DAILY" ? 7 : editFreq === "WEEKLY" ? 1 : null,
      });
      if (res.ok && res.habit) {
        setHabits((prev) =>
          prev.map((h) =>
            h.id === editingId
              ? {
                  ...h,
                  title: res.habit!.title,
                  description: res.habit!.description,
                  frequency: res.habit!.frequency,
                  targetPerWeek: res.habit!.targetPerWeek,
                }
              : h,
          ),
        );
        setEditingId(null);
      }
    });
  }

  function toggleDone(h: HabitRow) {
    startTransition(async () => {
      if (h.doneToday) {
        const res = await unlogHabitAction(h.id);
        if (res.ok) {
          setHabits((prev) =>
            prev.map((x) =>
              x.id === h.id
                ? {
                    ...x,
                    doneToday: false,
                    weekCount: Math.max(0, x.weekCount - 1),
                  }
                : x,
            ),
          );
        }
        return;
      }
      const res = await logHabitAction(h.id);
      if (res.ok) {
        setHabits((prev) =>
          prev.map((x) =>
            x.id === h.id
              ? { ...x, doneToday: true, weekCount: x.weekCount + 1 }
              : x,
          ),
        );
      }
    });
  }

  function remove(id: string) {
    if (!window.confirm("Apagar este objectivo/hábito?")) return;
    startTransition(async () => {
      await deleteHabitAction(id);
      setHabits((prev) => prev.filter((h) => h.id !== id));
    });
  }

  return (
    <div className="stack">
      <form className="form-stack panel" onSubmit={onCreate}>
        <div className="field">
          <label htmlFor="obj-title">Novo objectivo / hábito</label>
          <input
            id="obj-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Beber água · Ler 20 min"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="obj-desc">Nota (opcional)</label>
          <input
            id="obj-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="obj-freq">Frequência</label>
          <select
            id="obj-freq"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as HabitFrequency)}
          >
            {Object.entries(FREQ).map(([k, v]) => (
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
        {habits.length === 0 ? (
          <p className="muted">Ainda não tens objectivos. Cria o primeiro acima.</p>
        ) : (
          <ul className="list-plain">
            {habits.map((h) => (
              <li key={h.id} className="list-row task-row">
                {editingId === h.id ? (
                  <form className="form-stack" style={{ flex: 1 }} onSubmit={saveEdit}>
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      required
                    />
                    <input
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="Nota"
                    />
                    <select
                      value={editFreq}
                      onChange={(e) => setEditFreq(e.target.value as HabitFrequency)}
                      aria-label="Frequência"
                    >
                      {Object.entries(FREQ).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <div className="inline-actions">
                      <button className="btn btn-primary btn-sm" type="submit" disabled={pending}>
                        Gravar
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        type="button"
                        onClick={() => setEditingId(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <button
                      type="button"
                      className="task-hit"
                      onClick={() => startEdit(h)}
                    >
                      <strong
                        style={{
                          textDecoration: h.doneToday ? "line-through" : undefined,
                          opacity: h.doneToday ? 0.65 : 1,
                        }}
                      >
                        {h.title}
                      </strong>
                      <p className="muted small" style={{ margin: "0.2rem 0 0" }}>
                        {FREQ[h.frequency]}
                        {h.description ? ` · ${h.description}` : ""}
                        {h.targetPerWeek
                          ? ` · ${h.weekCount}/${h.targetPerWeek} esta semana`
                          : ` · ${h.weekCount} esta semana`}
                        {h.doneToday ? " · feito hoje" : ""}
                      </p>
                    </button>
                    <div className="inline-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={pending}
                        onClick={() => toggleDone(h)}
                      >
                        {h.doneToday ? "Desmarcar" : "Marcar hoje"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={pending}
                        onClick={() => remove(h.id)}
                      >
                        Apagar
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
