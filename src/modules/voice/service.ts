import type { CaptureIntent } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createTask } from "@/modules/tasks/service";
import { createEvent, suggestSlot } from "@/modules/calendar/service";

export type ParsedIntent = {
  intent: CaptureIntent;
  confidence: number;
  title: string;
  dayHint?: "today" | "tomorrow";
  hour?: number;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
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

/**
 * Parser heurístico em português — sem dependência de LLM externo.
 * Extensível: trocar por um provider de IA sem alterar a UI.
 */
export function parseVoiceIntent(utterance: string): ParsedIntent | null {
  const text = utterance.trim();
  if (!text) return null;

  const dayHint = extractDayHint(text);
  const hour = extractHour(text);

  for (const re of EVENT_PATTERNS) {
    const m = text.match(re);
    if (m) {
      const rest = cleanTitle(m[1] || text);
      const title = rest || "Evento";
      return {
        intent: "EVENT",
        confidence: 0.8,
        title,
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
      const priority = /\burgente\b/i.test(text)
        ? "URGENT"
        : /\bimportante\b/i.test(text)
          ? "HIGH"
          : "MEDIUM";
      return { intent: "TASK", confidence: 0.85, title, dayHint, priority };
    }
  }

  // Fallback: frase curta → tarefa
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
    note: "Não percebi bem. Experimenta «cria tarefa comprar pão» ou «marca reunião amanhã às 15».",
  };
}

export type CaptureResult = {
  ok: boolean;
  reply: string;
  intent: CaptureIntent;
  entityId?: string;
  entityType?: "task" | "event" | "reminder";
};

export async function processVoiceCapture(
  userId: string,
  utterance: string,
): Promise<CaptureResult> {
  const parsed = parseVoiceIntent(utterance);
  if (!parsed) {
    return {
      ok: false,
      reply: "Diz-me o que queres registar.",
      intent: "UNKNOWN",
    };
  }

  if (parsed.intent === "UNKNOWN") {
    await prisma.voiceCapture.create({
      data: {
        userId,
        transcript: utterance,
        intent: "UNKNOWN",
        confidence: parsed.confidence,
        resultJson: parsed,
      },
    });
    return {
      ok: false,
      reply: parsed.note || "Não percebi. Podes reformular?",
      intent: "UNKNOWN",
    };
  }

  if (parsed.intent === "EVENT") {
    const slot = suggestSlot({
      dayHint: parsed.dayHint,
      hour: parsed.hour,
      durationMinutes: 60,
    });
    const event = await createEvent({
      userId,
      title: parsed.title,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      source: "voice",
    });
    await prisma.voiceCapture.create({
      data: {
        userId,
        transcript: utterance,
        intent: "EVENT",
        confidence: parsed.confidence,
        resultJson: parsed,
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

  if (parsed.intent === "REMINDER") {
    // Estrutura pronta: cria lembrete na BD; UI completa vem depois
    const when = suggestSlot({
      dayHint: parsed.dayHint ?? "today",
      hour: parsed.hour ?? new Date().getHours() + 1,
      durationMinutes: 0,
    }).startsAt;
    const reminder = await prisma.reminder.create({
      data: {
        userId,
        title: parsed.title,
        remindAt: when,
        source: "voice",
      },
    });
    await prisma.voiceCapture.create({
      data: {
        userId,
        transcript: utterance,
        intent: "REMINDER",
        confidence: parsed.confidence,
        resultJson: parsed,
        createdEntity: `reminder:${reminder.id}`,
      },
    });
    return {
      ok: true,
      reply: `Lembrete guardado: «${reminder.title}». O módulo de avisos activos chega em breve.`,
      intent: "REMINDER",
      entityId: reminder.id,
      entityType: "reminder",
    };
  }

  // TASK (default)
  let dueAt: Date | null = null;
  if (parsed.dayHint === "today") {
    dueAt = new Date();
    dueAt.setHours(23, 59, 0, 0);
  } else if (parsed.dayHint === "tomorrow") {
    dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 1);
    dueAt.setHours(23, 59, 0, 0);
  }

  const task = await createTask({
    userId,
    title: parsed.title,
    priority: parsed.priority,
    dueAt,
    source: "voice",
  });

  await prisma.voiceCapture.create({
    data: {
      userId,
      transcript: utterance,
      intent: "TASK",
      confidence: parsed.confidence,
      resultJson: parsed,
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

export const voiceModule = {
  meta: { id: "VOICE" as const, label: "Captura" },
  parseVoiceIntent,
  processVoiceCapture,
};
