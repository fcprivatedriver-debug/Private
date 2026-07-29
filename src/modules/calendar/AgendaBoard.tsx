"use client";

/**
 * Vista de Agenda DIA / SEMANA / MÊS — UI no módulo calendar.
 * Importa apenas agenda-shared (sem Prisma).
 */
import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import {
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
} from "date-fns";
import { pt } from "date-fns/locale";
import {
  hourSlots,
  hydrateAgendaItem,
  monthGrid,
  parseDayIso,
  shiftDay,
  type AgendaItemDTO,
  type AgendaMode,
  type MonthDaySummary,
} from "@/modules/calendar/agenda-shared";
import { updateEventAction, updateTaskAction } from "@/actions/mel";
import { readMelPrefs } from "@/lib/mel-prefs";
import { registerUiView } from "@/core/ui-registry";

type AgendaItemView = ReturnType<typeof hydrateAgendaItem>;

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function itemsForHourView(items: AgendaItemView[], hour: number): AgendaItemView[] {
  return items.filter((i) => {
    if (i.allDay) return hour === 0;
    return i.startsAt.getHours() === hour;
  });
}

type Props = {
  initialMode?: AgendaMode;
  initialDayIso: string;
  dayItems: AgendaItemDTO[];
  weekColumns: { dayIso: string; label: string; items: AgendaItemDTO[] }[];
  monthSummaries: MonthDaySummary[];
  monthIso: string;
};

export function AgendaBoard({
  initialMode = "day",
  initialDayIso,
  dayItems: dayDtos,
  weekColumns: weekDtos,
  monthSummaries,
  monthIso,
}: Props) {
  const dayItems = useMemo(() => dayDtos.map(hydrateAgendaItem), [dayDtos]);
  const weekColumns = useMemo(
    () =>
      weekDtos.map((c) => ({
        dayIso: c.dayIso,
        label: c.label,
        items: c.items.map(hydrateAgendaItem),
      })),
    [weekDtos],
  );
  const [mode, setMode] = useState<AgendaMode>(initialMode);
  const [anchorIso, setAnchorIso] = useState(initialDayIso);
  const [editing, setEditing] = useState<AgendaItemView | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftWhen, setDraftWhen] = useState("");
  const [pending, startTransition] = useTransition();

  const anchor = useMemo(() => parseDayIso(anchorIso), [anchorIso]);
  const month = useMemo(() => startOfMonth(parseDayIso(monthIso)), [monthIso]);
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    const n = new Date();
    setToday(new Date(n.getFullYear(), n.getMonth(), n.getDate()));
  }, []);
  const summaryMap = useMemo(() => {
    const m = new Map<string, MonthDaySummary>();
    for (const s of monthSummaries) m.set(s.day, s);
    return m;
  }, [monthSummaries]);

  const grid = useMemo(() => monthGrid(month), [month]);

  function openItem(item: AgendaItemView) {
    setEditing(item);
    setDraftTitle(item.title);
    setDraftWhen(toLocalInput(new Date(item.startsAt)));
  }

  function cancelEdit() {
    setEditing(null);
  }

  function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const prefs = readMelPrefs();
    startTransition(async () => {
      if (editing.taskId) {
        await updateTaskAction(
          editing.taskId,
          {
            title: draftTitle,
            dueAt: draftWhen || null,
          },
          { removeCalendarOnTaskDone: prefs.removeCalendarOnTaskDone },
        );
      } else {
        const start = new Date(draftWhen);
        const end = new Date(start.getTime() + 30 * 60 * 1000);
        await updateEventAction(editing.id, {
          title: draftTitle,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
        });
      }
      setEditing(null);
      window.location.reload();
    });
  }

  function nav(delta: number) {
    const next = shiftDay(
      anchor,
      mode === "month" ? delta * 30 : mode === "week" ? delta * 7 : delta,
    );
    const q = new URLSearchParams(window.location.search);
    q.set("mode", mode);
    q.set("day", format(next, "yyyy-MM-dd"));
    window.location.href = `${window.location.pathname}?${q.toString()}`;
  }

  function setModeNav(next: AgendaMode) {
    setMode(next);
    const q = new URLSearchParams(window.location.search);
    q.set("mode", next);
    q.set("day", format(anchor, "yyyy-MM-dd"));
    window.location.href = `${window.location.pathname}?${q.toString()}`;
  }

  return (
    <div className="stack agenda-board">
      <div className="agenda-toolbar">
        <div className="segmented" role="tablist" aria-label="Vista da agenda">
          {(
            [
              ["day", "Dia"],
              ["week", "Semana"],
              ["month", "Mês"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              className={mode === id ? "seg active" : "seg"}
              onClick={() => setModeNav(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="agenda-nav">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => nav(-1)}>
            ←
          </button>
          <strong>
            {mode === "month"
              ? format(month, "MMMM yyyy", { locale: pt })
              : format(anchor, "d MMM yyyy", { locale: pt })}
          </strong>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => nav(1)}>
            →
          </button>
        </div>
      </div>

      {mode === "day" ? (
        <div className="agenda-day panel">
          {dayItems.length === 0 ? (
            <p className="muted">Nada agendado neste dia.</p>
          ) : (
            hourSlots().map((h) => {
              const slots = itemsForHourView(dayItems, h);
              if (slots.length === 0) return null;
              const label = `${String(h).padStart(2, "0")}:00`;
              return (
                <div key={h} className="agenda-hour-row">
                  <span className="agenda-hour-label muted small">{label}</span>
                  <div className="agenda-hour-items">
                    {slots.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`agenda-chip${item.done ? " done" : ""}`}
                        style={{ borderLeftColor: item.color || "var(--accent)" }}
                        onClick={() => openItem(item)}
                      >
                        <strong>{item.title}</strong>
                        <span className="muted small">
                          {item.startsAtLabel}
                          {item.kind === "task" ? " · tarefa" : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : null}

      {mode === "week" ? (
        <div className="agenda-week panel">
          <div className="agenda-week-grid">
            {weekColumns.map((col) => (
              <div key={col.dayIso} className="agenda-week-col">
                <div className="agenda-week-head">
                  <strong>{col.label}</strong>
                  <span className="badge">{col.items.length}</span>
                </div>
                <ul className="list-plain">
                  {col.items.length === 0 ? (
                    <li className="muted small">Livre</li>
                  ) : (
                    col.items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={`agenda-chip compact${item.done ? " done" : ""}`}
                          style={{ borderLeftColor: item.color || "var(--accent)" }}
                          onClick={() => openItem(item)}
                        >
                          <span className="small">{item.startsAtLabel}</span>{" "}
                          {item.title}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ))}
          </div>
          <p className="muted small" style={{ marginTop: "0.75rem" }}>
            Vista semana: 7 colunas com lista agregada por dia (sem grelha hora×coluna) —
            melhor em mobile.
          </p>
        </div>
      ) : null}

      {mode === "month" ? (
        <div className="agenda-month panel">
          <div className="agenda-month-head">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
              <span key={d} className="muted small">
                {d}
              </span>
            ))}
          </div>
          <div className="agenda-month-grid">
            {grid.map((d) => {
              const key = format(d, "yyyy-MM-dd");
              const sum = summaryMap.get(key);
              const inMonth = isSameMonth(d, month);
              const isToday = today ? isSameDay(d, today) : false;
              const dot =
                sum && sum.count > 0
                  ? sum.topPriority === "HIGH"
                    ? "dot-high"
                    : sum.topPriority === "LOW"
                      ? "dot-low"
                      : "dot-med"
                  : "";
              return (
                <button
                  key={key}
                  type="button"
                  className={`agenda-month-cell${!inMonth ? " outside" : ""}${isToday ? " today" : ""}`}
                  onClick={() => {
                    setAnchorIso(key);
                    const q = new URLSearchParams();
                    q.set("mode", "day");
                    q.set("day", key);
                    window.location.href = `${window.location.pathname}?${q.toString()}`;
                  }}
                >
                  <span>{format(d, "d")}</span>
                  {sum && sum.count > 0 ? (
                    <span className="agenda-month-meta">
                      <span className={`agenda-dot ${dot}`} aria-hidden />
                      <span className="badge tiny">{sum.count}</span>
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {editing ? (
        <div className="speak-overlay" role="dialog" aria-modal="true">
          <div className="speak-overlay-backdrop" onClick={cancelEdit} />
          <form className="speak-overlay-panel form-stack" onSubmit={saveEdit}>
            <div className="speak-overlay-head">
              <h2 className="page-title" style={{ fontSize: "1.2rem", margin: 0 }}>
                {editing.kind === "task" ? "Editar tarefa" : "Editar evento"}
              </h2>
              <button type="button" className="btn btn-ghost btn-sm" onClick={cancelEdit}>
                Cancelar
              </button>
            </div>
            <div className="field">
              <label htmlFor="ag-title">Título</label>
              <input
                id="ag-title"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="ag-when">Data / hora</label>
              <input
                id="ag-when"
                type="datetime-local"
                value={draftWhen}
                onChange={(e) => setDraftWhen(e.target.value)}
                required
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={pending}>
              {pending ? "A guardar…" : "Gravar"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

registerUiView("calendar.agenda", AgendaBoard);
