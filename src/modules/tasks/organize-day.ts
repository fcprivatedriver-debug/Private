/**
 * Organiza o meu dia — proposta de horário sem alterar nada até confirmação.
 * Usa só dados de tasks + calendar (via callers/capabilities).
 */
import type { Task, CalendarEvent } from "@prisma/client";
import { addMinutes, format } from "date-fns";
import { parseTaskEventMeta, isTaskEventDone } from "@/modules/calendar/markers";
import {
  formatDayIso,
  isUntimedDueAt,
  zonedDateTimeToUtc,
  zonedParts,
} from "@/lib/zoned-date";

export type PlanSlotKind = "task" | "event" | "focus" | "deferred";

export type DayPlanSlot = {
  /** id estável na proposta (para UI) */
  key: string;
  kind: PlanSlotKind;
  title: string;
  startsAt: string;
  endsAt: string;
  taskId?: string;
  /** ids agrupados num bloco de foco */
  taskIds?: string[];
  eventId?: string;
  /** urgente | importante | adiável | compromisso | bloco de foco */
  badge: string;
  /** compromisso fixo — não mover ao aplicar */
  locked: boolean;
};

export type DayPlanProposal = {
  summary: string;
  slots: DayPlanSlot[];
  conflicts: string[];
  /** Perguntas mínimas se faltar info */
  questions: string[];
  /** Preferência aplicada (hora de início sugerida) */
  dayStartHour: number;
};

export type OrganizePrefs = {
  /** Hora de início do dia útil (default 9) */
  dayStartHour?: number;
  /** Preferência ao ajustar: morning | afternoon */
  prefer?: "morning" | "afternoon";
};

const LUNCH_START = 12 * 60 + 30;
const LUNCH_END = 14 * 60;
const DAY_END = 18 * 60 + 30;

function minutesOf(d: Date): number {
  const p = zonedParts(d);
  return p.hour * 60 + p.minute;
}

function atMinutes(day: Date, mins: number): Date {
  const iso = formatDayIso(day);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return zonedDateTimeToUtc(
    Number(iso.slice(0, 4)),
    Number(iso.slice(5, 7)),
    Number(iso.slice(8, 10)),
    h,
    m,
    0,
    0,
  );
}

function looksTimed(dueAt: Date | null | undefined): boolean {
  if (!dueAt) return false;
  return !isUntimedDueAt(dueAt);
}

function priorityRank(p: string): number {
  if (p === "URGENT") return 0;
  if (p === "HIGH") return 1;
  if (p === "LOW") return 3;
  return 2;
}

function badgeForTask(p: string): string {
  if (p === "URGENT") return "urgente";
  if (p === "HIGH") return "importante";
  if (p === "LOW") return "adiável";
  return "importante";
}

function estimateMinutes(task: Task): number {
  if (task.priority === "URGENT" || task.priority === "HIGH") return 60;
  if (task.priority === "LOW") return 25;
  return 40;
}

function tokenSet(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .split(/[^a-z0-9]+/i)
      .filter((t) => t.length > 3),
  );
}

function similar(a: Task, b: Task): boolean {
  const sharedTag = a.tags.some((t) => b.tags.includes(t));
  if (sharedTag) return true;
  const ta = tokenSet(a.title);
  const tb = tokenSet(b.title);
  let hit = 0;
  for (const t of ta) if (tb.has(t)) hit += 1;
  return hit >= 2;
}

type Busy = { start: number; end: number; label: string };

function overlaps(a: Busy, b: Busy): boolean {
  return a.start < b.end && b.start < a.end;
}

function findFreeSlot(
  busy: Busy[],
  from: number,
  duration: number,
  dayEnd: number,
): number | null {
  let cursor = from;
  const sorted = [...busy].sort((x, y) => x.start - y.start);
  while (cursor + duration <= dayEnd) {
    // saltar almoço
    if (cursor < LUNCH_END && cursor + duration > LUNCH_START) {
      cursor = LUNCH_END;
      continue;
    }
    const block: Busy = { start: cursor, end: cursor + duration, label: "" };
    const hit = sorted.find((b) => overlaps(block, b));
    if (!hit) return cursor;
    cursor = Math.max(cursor + 5, hit.end);
  }
  return null;
}

/**
 * Constrói proposta de organização do dia (sem side-effects).
 */
export function buildDayPlan(
  day: Date,
  tasks: Task[],
  events: CalendarEvent[],
  prefs?: OrganizePrefs,
): DayPlanProposal {
  const prefer = prefs?.prefer;
  let dayStart =
    typeof prefs?.dayStartHour === "number" ? prefs.dayStartHour * 60 : 9 * 60;
  if (prefer === "afternoon") dayStart = Math.max(dayStart, 14 * 60);
  if (prefer === "morning") dayStart = Math.min(dayStart, 9 * 60);

  const openTasks = tasks.filter(
    (t) => t.status === "TODO" || t.status === "IN_PROGRESS",
  );

  const fixedEvents = events.filter((e) => {
    if (isTaskEventDone(e.description)) return false;
    // eventos sync de tarefas — tratados via tasks; evita duplicar
    const meta = parseTaskEventMeta(e.description);
    if (e.source === "task-sync" || meta) return false;
    return true;
  });

  const conflicts: string[] = [];
  const questions: string[] = [];
  const slots: DayPlanSlot[] = [];
  const busy: Busy[] = [];

  // 1) Compromissos fixos
  for (const e of fixedEvents) {
    const start = minutesOf(e.startsAt);
    const end = Math.max(start + 30, minutesOf(e.endsAt));
    const block = { start, end, label: e.title };
    for (const b of busy) {
      if (overlaps(block, b)) {
        conflicts.push(`Conflito entre «${e.title}» e «${b.label}».`);
      }
    }
    busy.push(block);
    slots.push({
      key: `event-${e.id}`,
      kind: "event",
      title: e.title,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt.toISOString(),
      eventId: e.id,
      badge: "compromisso",
      locked: true,
    });
  }

  // 2) Tarefas com hora definida — tentar manter
  const timed = openTasks
    .filter((t) => looksTimed(t.dueAt))
    .sort((a, b) => (a.dueAt!.getTime() - b.dueAt!.getTime()));
  const untimed = openTasks.filter((t) => !looksTimed(t.dueAt));

  for (const t of timed) {
    const start = minutesOf(t.dueAt!);
    const dur = estimateMinutes(t);
    const end = start + dur;
    const block = { start, end, label: t.title };
    const clash = busy.find((b) => overlaps(block, b));
    if (clash) {
      conflicts.push(
        `«${t.title}» às ${format(t.dueAt!, "HH:mm")} sobrepõe «${clash.label}» — vou tentar outro horário.`,
      );
      // remarca para slot livre
      const free = findFreeSlot(busy, dayStart, dur, DAY_END);
      if (free == null) {
        slots.push({
          key: `def-${t.id}`,
          kind: "deferred",
          title: t.title,
          startsAt: atMinutes(day, DAY_END - 30).toISOString(),
          endsAt: atMinutes(day, DAY_END).toISOString(),
          taskId: t.id,
          badge: "adiável",
          locked: false,
        });
        continue;
      }
      busy.push({ start: free, end: free + dur, label: t.title });
      slots.push({
        key: `task-${t.id}`,
        kind: "task",
        title: t.title,
        startsAt: atMinutes(day, free).toISOString(),
        endsAt: atMinutes(day, free + dur).toISOString(),
        taskId: t.id,
        badge: badgeForTask(t.priority),
        locked: false,
      });
    } else {
      busy.push(block);
      slots.push({
        key: `task-${t.id}`,
        kind: "task",
        title: t.title,
        startsAt: t.dueAt!.toISOString(),
        endsAt: addMinutes(t.dueAt!, dur).toISOString(),
        taskId: t.id,
        badge: badgeForTask(t.priority),
        locked: false,
      });
    }
  }

  // 3) Agrupar tarefas sem hora semelhantes → blocos de foco
  const remaining = [...untimed].sort(
    (a, b) => priorityRank(a.priority) - priorityRank(b.priority),
  );
  const used = new Set<string>();
  const groups: Task[][] = [];

  for (const t of remaining) {
    if (used.has(t.id)) continue;
    const group = [t];
    used.add(t.id);
    for (const other of remaining) {
      if (used.has(other.id)) continue;
      if (similar(t, other) && group.length < 4) {
        group.push(other);
        used.add(other.id);
      }
    }
    groups.push(group);
  }

  for (const group of groups) {
    const isLow = group.every((t) => t.priority === "LOW");
    const dur = group.reduce((s, t) => s + estimateMinutes(t), 0);
    const from = prefer === "afternoon" ? Math.max(dayStart, LUNCH_END) : dayStart;
    const free = findFreeSlot(busy, from, Math.min(dur, 120), DAY_END);

    if (free == null || isLow) {
      for (const t of group) {
        slots.push({
          key: `def-${t.id}`,
          kind: "deferred",
          title: t.title,
          startsAt: atMinutes(day, DAY_END - 20).toISOString(),
          endsAt: atMinutes(day, DAY_END).toISOString(),
          taskId: t.id,
          badge: "adiável",
          locked: false,
        });
      }
      continue;
    }

    if (group.length >= 2) {
      busy.push({ start: free, end: free + dur, label: "foco" });
      const titles = group.map((t) => t.title).join(", ");
      slots.push({
        key: `focus-${group.map((t) => t.id).join("-")}`,
        kind: "focus",
        title: `Bloco de foco — ${titles}`,
        startsAt: atMinutes(day, free).toISOString(),
        endsAt: atMinutes(day, free + dur).toISOString(),
        taskIds: group.map((t) => t.id),
        badge: "bloco de foco",
        locked: false,
      });
    } else {
      const t = group[0]!;
      busy.push({ start: free, end: free + dur, label: t.title });
      slots.push({
        key: `task-${t.id}`,
        kind: "task",
        title: t.title,
        startsAt: atMinutes(day, free).toISOString(),
        endsAt: atMinutes(day, free + dur).toISOString(),
        taskId: t.id,
        badge: badgeForTask(t.priority),
        locked: false,
      });
    }
  }

  // Ordenar slots por hora
  slots.sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  if (openTasks.length === 0 && fixedEvents.length === 0) {
    questions.push("Não tens tarefas nem compromissos para hoje. Queres criar alguma?");
  } else if (openTasks.length > 0 && !openTasks.some((t) => looksTimed(t.dueAt)) && fixedEvents.length === 0) {
    questions.push(
      "Nada tem hora marcada. Preferes começar de manhã (09:00) ou à tarde (14:00)? Usa «Ajustar».",
    );
  }

  const lines = slots.map((s) => {
    const hh = format(new Date(s.startsAt), "HH:mm");
    if (s.kind === "deferred") {
      return `${hh} — ${s.title} (pode adiar)`;
    }
    if (s.kind === "focus") {
      return `${hh} — bloco de foco`;
    }
    if (s.kind === "event") {
      return `${hh} — compromisso: ${s.title}`;
    }
    return `${hh} — ${s.title} (${s.badge})`;
  });

  const summary =
    slots.length === 0
      ? "Não encontrei nada para organizar hoje."
      : [
          "Organizei o teu dia assim:",
          ...lines,
          conflicts.length ? `Atenção: ${conflicts.join(" ")}` : "",
          "Queres aplicar esta organização?",
        ]
          .filter(Boolean)
          .join("\n");

  return {
    summary,
    slots,
    conflicts,
    questions,
    dayStartHour: Math.floor(dayStart / 60),
  };
}

/** Extrai actualizações de tarefas a partir dos slots (para aplicar). */
export function planToTaskUpdates(
  slots: DayPlanSlot[],
): { taskId: string; dueAt: Date }[] {
  const out: { taskId: string; dueAt: Date }[] = [];
  for (const s of slots) {
    if (s.locked) continue;
    if (s.kind === "deferred") continue; // não força adiáveis
    if (s.taskId) {
      out.push({ taskId: s.taskId, dueAt: new Date(s.startsAt) });
    }
    if (s.taskIds?.length) {
      // distribuir dentro do bloco (espaçadas 5 min)
      let offset = 0;
      for (const id of s.taskIds) {
        out.push({
          taskId: id,
          dueAt: addMinutes(new Date(s.startsAt), offset),
        });
        offset += 5;
      }
    }
  }
  return out;
}
