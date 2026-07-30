/**
 * Datas em fuso da Mel (Europe/Lisbon por defeito).
 * Sem dependências novas — só Intl + Date.
 */
import { DEFAULT_TIMEZONE } from "@/config/constants";

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Partes do calendário/relógio num fuso (ex.: Europe/Lisbon). */
export function zonedParts(
  date: Date,
  timeZone: string = DEFAULT_TIMEZONE,
): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/** yyyy-MM-dd no fuso (nunca UTC do processo). */
export function formatDayIso(
  date: Date = new Date(),
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/**
 * Converte componentes de calendário no fuso → instante UTC.
 * Itera para corrigir o offset (DST).
 */
export function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
  ms = 0,
  timeZone: string = DEFAULT_TIMEZONE,
): Date {
  let utc = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  for (let i = 0; i < 4; i++) {
    const got = zonedParts(new Date(utc), timeZone);
    const wantMs = Date.UTC(year, month - 1, day, hour, minute, second, ms);
    const gotMs = Date.UTC(
      got.year,
      got.month - 1,
      got.day,
      got.hour,
      got.minute,
      got.second,
      ms,
    );
    const delta = wantMs - gotMs;
    if (delta === 0) break;
    utc += delta;
  }
  return new Date(utc);
}

export function startOfZonedDay(
  date: Date = new Date(),
  timeZone: string = DEFAULT_TIMEZONE,
): Date {
  const p = zonedParts(date, timeZone);
  return zonedDateTimeToUtc(p.year, p.month, p.day, 0, 0, 0, 0, timeZone);
}

export function endOfZonedDay(
  date: Date = new Date(),
  timeZone: string = DEFAULT_TIMEZONE,
): Date {
  const p = zonedParts(date, timeZone);
  return zonedDateTimeToUtc(p.year, p.month, p.day, 23, 59, 59, 999, timeZone);
}

/** Limites UTC do dia civil yyyy-MM-dd no fuso. */
export function boundsForDayIso(
  dayIso: string,
  timeZone: string = DEFAULT_TIMEZONE,
): { from: Date; to: Date } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayIso.trim());
  if (!m) {
    const now = new Date();
    return { from: startOfZonedDay(now, timeZone), to: endOfZonedDay(now, timeZone) };
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return {
    from: zonedDateTimeToUtc(y, mo, d, 0, 0, 0, 0, timeZone),
    to: zonedDateTimeToUtc(y, mo, d, 23, 59, 59, 999, timeZone),
  };
}

/**
 * Interpreta valor de <input type="datetime-local"> ou "yyyy-MM-dd"
 * como hora de parede em Europe/Lisbon (não como UTC do servidor).
 */
export function parseDatetimeLocalInZone(
  value: string,
  timeZone: string = DEFAULT_TIMEZONE,
): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withTime = trimmed.includes("T")
    ? trimmed
    : `${trimmed}T00:00`;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(withTime);
  if (!m) return null;
  return zonedDateTimeToUtc(
    Number(m[1]),
    Number(m[2]),
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
    Number(m[6] || 0),
    0,
    timeZone,
  );
}

/** Data-only no fuso → instante “fim do dia” (sem hora útil / all-day). */
export function dueAtEndOfDayInZone(
  dayIso: string,
  timeZone: string = DEFAULT_TIMEZONE,
): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayIso.trim());
  if (!m) return endOfZonedDay(new Date(), timeZone);
  return zonedDateTimeToUtc(
    Number(m[1]),
    Number(m[2]),
    Number(m[3]),
    23,
    59,
    0,
    0,
    timeZone,
  );
}

/** True se dueAt representa prazo sem hora (23:50–23:59 no fuso). */
export function isUntimedDueAt(
  dueAt: Date,
  timeZone: string = DEFAULT_TIMEZONE,
): boolean {
  const p = zonedParts(dueAt, timeZone);
  if (p.hour === 0 && p.minute === 0) return true;
  return p.hour === 23 && p.minute >= 50;
}

export function formatZonedTime(
  date: Date,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  const p = zonedParts(date, timeZone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

export function formatZonedDateTimePt(
  date: Date,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  return date.toLocaleString("pt-PT", {
    timeZone,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Desloca um yyyy-MM-dd por N dias civis (calendário gregoriano). */
export function shiftDayIso(dayIso: string, deltaDays: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayIso);
  if (!m) return dayIso;
  const utc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + deltaDays, 12);
  const d = new Date(utc);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function todayIso(timeZone: string = DEFAULT_TIMEZONE): string {
  return formatDayIso(new Date(), timeZone);
}
