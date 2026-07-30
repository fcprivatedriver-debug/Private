"use client";

import { FormEvent, useState, useTransition } from "react";
import { createEventAction, deleteEventAction } from "@/actions/mel";
import type { CalendarEvent } from "@prisma/client";

function defaultStart() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventList({ initial }: { initial: CalendarEvent[] }) {
  const [events, setEvents] = useState(initial);
  const [title, setTitle] = useState("");
  const start = defaultStart();
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const [startsAt, setStartsAt] = useState(toLocalInput(start));
  const [endsAt, setEndsAt] = useState(toLocalInput(end));
  const [pending, startTransition] = useTransition();

  function onCreate(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createEventAction({ title, startsAt, endsAt });
      if (res.ok && res.event) {
        setEvents((prev) =>
          [...prev, res.event!].sort(
            (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
          ),
        );
        setTitle("");
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteEventAction(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    });
  }

  return (
    <div className="stack">
      <form className="form-stack panel" onSubmit={onCreate}>
        <div className="field">
          <label htmlFor="event-title">Novo evento</label>
          <input
            id="event-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Reunião de equipa"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="starts">Início</label>
          <input
            id="starts"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="ends">Fim</label>
          <input
            id="ends"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          Marcar
        </button>
      </form>

      <div className="panel">
        {events.length === 0 ? (
          <p className="muted">Sem eventos neste período.</p>
        ) : (
          <ul className="list-plain">
            {events.map((event) => (
              <li key={event.id} className="list-row">
                <div>
                  <strong>{event.title}</strong>
                  <p className="muted small" style={{ margin: "0.25rem 0 0" }}>
                    {new Date(event.startsAt).toLocaleString("pt-PT", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {event.location ? ` · ${event.location}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => remove(event.id)}
                  disabled={pending}
                >
                  Apagar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
