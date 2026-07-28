import type { CaptureIntent, TaskPriority } from "@prisma/client";
import { prisma } from "@/lib/db";
import { invokeCapability, registerCapability, type DetectedIntent } from "@/core/capabilities";

function suggestSlot(opts: {
  dayHint?: "today" | "tomorrow";
  hour?: number;
  durationMinutes?: number;
}): { startsAt: Date; endsAt: Date } {
  const day = new Date();
  if (opts.dayHint === "tomorrow" || !opts.dayHint) {
    day.setDate(day.getDate() + 1);
  }
  const hour = opts.hour ?? 10;
  const duration = opts.durationMinutes ?? 60;
  const startsAt = new Date(day);
  startsAt.setHours(hour, 0, 0, 0);
  const endsAt = new Date(startsAt);
  endsAt.setMinutes(endsAt.getMinutes() + duration);
  return { startsAt, endsAt };
}

export type ParsedIntent = {
  intent: CaptureIntent;
  confidence: number;
  title: string;
  dayHint?: "today" | "tomorrow";
  hour?: number;
  priority?: TaskPriority;
  note?: string;
};

const TASK_PATTERNS = [
  /^(?:cria|criar|adiciona|adicionar|nova?)\s+(?:uma?\s+)?tarefa\s+(.+)$/i,
  /^(?:tens de|tenho de|preciso de|lembra[- ]?me de)\s+(.+)$/i,
  /^tarefa[:\s]+(.+)$/i,
  /^(?:fazer|faz)\s+(.+)$/i,
];

const EVENT_PATTERNS = [
  /^(?:marca|marcar|agenda|agendar|evento)\s+(.+)$/i,
  /^(?:reuni[aã]o|consulta|almo[cç]o|jantar)\s*(.*)$/i,
];

const REMINDER_PATTERNS = [
  /^(?:lembra[- ]?me|aviso|lembrar)\s+(?:de\s+)?(.+)$/i,
];

const QUERY_TODAY =
  /(?:quais|que|o que).*(?:tarefas?|fazer|pendente).*(?:hoje)|(?:tarefas?|fazer).*(?:hoje).*(?:prioridade)?|(?:hoje).*(?:tarefas?|fazer|prioridade)|o que tenho (?:para )?fazer(?: hoje)?|o que tenho hoje/i;

const QUERY_TOP =
  /(?:prioridade mais alta|mais (?:urgente|importante)|qual (?:é )?a (?:minha )?prioridade)/i;

const QUERY_BY_PRIORITY =
  /(?:hoje).*(?:por prioridade)|(?:por prioridade).*(?:hoje)|tarefas? (?:de |para )?hoje por prioridade/i;

function extractHour(text: string): number | undefined {
  const m = text.match(/(?:às|as|a)\s+(\d{1,2})(?:[:h](\d{2}))?/i);
  if (!m) return undefined;
  const h = Number(m[1]);
  if (h >= 0 && h <= 23) return h;
  return undefined;
}

function extractDayHint(text: string): "today" | "tomorrow" | undefined {
  if (/\bhoje\b/i.test(text)) return "today";
  if (/\bamanh[aã]\b/i.test(text)) return "tomorrow";
  return undefined;
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/\b(?:hoje|amanh[aã]|às|as)\s+\d{1,2}(?:[:h]\d{2})?/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["«]|["»]$/g, "");
}

export function parseVoiceIntent(utterance: string): ParsedIntent | null {
  const text = utterance.trim();
  if (!text) return null;

  const dayHint = extractDayHint(text);
  const hour = extractHour(text);

  for (const re of EVENT_PATTERNS) {
    const m = text.match(re);
    if (m) {
      const rest = cleanTitle(m[1] || text);
      return {
        intent: "EVENT",
        confidence: 0.8,
        title: rest || "Evento",
        dayHint: dayHint ?? "tomorrow",
        hour,
      };
    }
  }

  for (const re of REMINDER_PATTERNS) {
    const m = text.match(re);
    if (m) {
      return {
        intent: "REMINDER",
        confidence: 0.75,
        title: cleanTitle(m[1]) || "Lembrete",
        dayHint,
        hour,
      };
    }
  }

  for (const re of TASK_PATTERNS) {
    const m = text.match(re);
    if (m) {
      const title = cleanTitle(m[1]);
      if (!title) continue;
      const priority: TaskPriority = /\burgente\b/i.test(text)
        ? "URGENT"
        : /\bimportante\b/i.test(text)
          ? "HIGH"
          : "MEDIUM";
      return { intent: "TASK", confidence: 0.85, title, dayHint, priority };
    }
  }

  if (text.length <= 120 && !/[?]/.test(text)) {
    return {
      intent: "TASK",
      confidence: 0.55,
      title: cleanTitle(text),
      dayHint,
      priority: "MEDIUM",
    };
  }

  return {
    intent: "UNKNOWN",
    confidence: 0.2,
    title: text,
    note: "Não percebi bem. Experimenta «cria tarefa comprar pão» ou «quais as tarefas para hoje».",
  };
}

/** Capability voice.detectIntent */
export async function detectIntent(utterance: string): Promise<DetectedIntent> {
  const text = utterance.trim();
  if (!text) {
    return {
      kind: "capture",
      intent: "UNKNOWN",
      title: "",
      confidence: 0,
      note: "Diz-me o que queres.",
    };
  }

  if (QUERY_TOP.test(text) && !QUERY_BY_PRIORITY.test(text)) {
    return { kind: "query_top_priority" };
  }
  if (
    QUERY_BY_PRIORITY.test(text) ||
    QUERY_TODAY.test(text) ||
    /tarefas? (?:de |para )?hoje/i.test(text)
  ) {
    return { kind: "query_today_tasks" };
  }

  const parsed = parseVoiceIntent(text);
  if (!parsed) {
    return {
      kind: "capture",
      intent: "UNKNOWN",
      title: "",
      confidence: 0,
      note: "Diz-me o que queres registar.",
    };
  }

  return {
    kind: "capture",
    intent: parsed.intent as "TASK" | "EVENT" | "REMINDER" | "UNKNOWN",
    title: parsed.title,
    dayHint: parsed.dayHint,
    hour: parsed.hour,
    priority: parsed.priority,
    note: parsed.note,
    confidence: parsed.confidence,
  };
}

export type CaptureResult = {
  ok: boolean;
  reply: string;
  intent: CaptureIntent;
  entityId?: string;
  entityType?: "task" | "event" | "reminder";
};

export async function processDetectedCapture(
  userId: string,
  utterance: string,
  detected: DetectedIntent,
): Promise<CaptureResult> {
  if (detected.kind !== "capture") {
    return { ok: false, reply: "Intenção inválida para captura.", intent: "UNKNOWN" };
  }

  if (detected.intent === "UNKNOWN") {
    await prisma.voiceCapture.create({
      data: {
        userId,
        transcript: utterance,
        intent: "UNKNOWN",
        confidence: detected.confidence,
        resultJson: detected,
      },
    });
    return {
      ok: false,
      reply: detected.note || "Não percebi. Podes reformular?",
      intent: "UNKNOWN",
    };
  }

  if (detected.intent === "EVENT") {
    const slot = suggestSlot({
      dayHint: detected.dayHint,
      hour: detected.hour,
      durationMinutes: 60,
    });
    const event = await invokeCapability("calendar.create", {
      userId,
      title: detected.title,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      source: "voice",
    });
    await prisma.voiceCapture.create({
      data: {
        userId,
        transcript: utterance,
        intent: "EVENT",
        confidence: detected.confidence,
        resultJson: detected,
        createdEntity: `event:${event.id}`,
      },
    });
    const when = slot.startsAt.toLocaleString("pt-PT", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    return {
      ok: true,
      reply: `Marcado: «${event.title}» — ${when}.`,
      intent: "EVENT",
      entityId: event.id,
      entityType: "event",
    };
  }

  if (detected.intent === "REMINDER") {
    const when = suggestSlot({
      dayHint: detected.dayHint ?? "today",
      hour: detected.hour ?? new Date().getHours() + 1,
      durationMinutes: 0,
    }).startsAt;
    const reminder = await prisma.reminder.create({
      data: {
        userId,
        title: detected.title,
        remindAt: when,
        source: "voice",
      },
    });
    await prisma.voiceCapture.create({
      data: {
        userId,
        transcript: utterance,
        intent: "REMINDER",
        confidence: detected.confidence,
        resultJson: detected,
        createdEntity: `reminder:${reminder.id}`,
      },
    });
    return {
      ok: true,
      reply: `Lembrete guardado: «${reminder.title}».`,
      intent: "REMINDER",
      entityId: reminder.id,
      entityType: "reminder",
    };
  }

  let dueAt: Date | null = null;
  if (detected.dayHint === "today" || detected.dayHint === "tomorrow") {
    dueAt = new Date();
    if (detected.dayHint === "tomorrow") {
      dueAt.setDate(dueAt.getDate() + 1);
    }
    if (typeof detected.hour === "number") {
      dueAt.setHours(detected.hour, 0, 0, 0);
    } else {
      dueAt.setHours(23, 59, 0, 0);
    }
  } else if (typeof detected.hour === "number") {
    dueAt = new Date();
    dueAt.setHours(detected.hour, 0, 0, 0);
  }

  const task = await invokeCapability("tasks.create", {
    userId,
    title: detected.title,
    priority: detected.priority,
    dueAt,
    source: "voice",
  });

  await prisma.voiceCapture.create({
    data: {
      userId,
      transcript: utterance,
      intent: "TASK",
      confidence: detected.confidence,
      resultJson: detected,
      createdEntity: `task:${task.id}`,
    },
  });

  return {
    ok: true,
    reply: `Tarefa criada: «${task.title}».`,
    intent: "TASK",
    entityId: task.id,
    entityType: "task",
  };
}

/** Compat: captura completa via router-friendly path */
export async function processVoiceCapture(
  userId: string,
  utterance: string,
): Promise<CaptureResult> {
  const { routeUtterance } = await import("@/core/router");
  const routed = await routeUtterance(userId, utterance);
  return {
    ok: routed.ok,
    reply: routed.reply,
    intent: routed.intent === "capture" ? "TASK" : "NOTE",
  };
}

export function registerVoiceCapabilities(): void {
  registerCapability("voice.detectIntent", async ({ utterance }) =>
    detectIntent(utterance),
  );
}

export const voiceModule = {
  meta: { id: "VOICE" as const, label: "Captura" },
  parseVoiceIntent,
  detectIntent,
  processVoiceCapture,
  processDetectedCapture,
  registerVoiceCapabilities,
};
