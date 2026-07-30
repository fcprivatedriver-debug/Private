import { prisma } from "@/lib/db";
import { startOfWeek, endOfWeek, subWeeks, format } from "date-fns";
import { pt } from "date-fns/locale";

export type WeeklyMetrics = {
  tasksCreated: number;
  tasksDone: number;
  tasksOpen: number;
  eventsCount: number;
  voiceCaptures: number;
  completionRate: number;
};

export type WeeklyHighlight = {
  kind: "win" | "focus" | "tip";
  text: string;
};

function weekBounds(reference = new Date()) {
  const weekStart = startOfWeek(reference, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(reference, { weekStartsOn: 1 });
  return { weekStart, weekEnd };
}

export async function computeWeeklyMetrics(
  userId: string,
  reference = new Date(),
): Promise<WeeklyMetrics> {
  const { weekStart, weekEnd } = weekBounds(reference);

  const [tasksCreated, tasksDone, tasksOpen, eventsCount, voiceCaptures] =
    await Promise.all([
      prisma.task.count({
        where: { userId, createdAt: { gte: weekStart, lte: weekEnd } },
      }),
      prisma.task.count({
        where: {
          userId,
          status: "DONE",
          completedAt: { gte: weekStart, lte: weekEnd },
        },
      }),
      prisma.task.count({
        where: { userId, status: { in: ["TODO", "IN_PROGRESS"] } },
      }),
      prisma.calendarEvent.count({
        where: {
          userId,
          startsAt: { gte: weekStart, lte: weekEnd },
        },
      }),
      prisma.voiceCapture.count({
        where: { userId, createdAt: { gte: weekStart, lte: weekEnd } },
      }),
    ]);

  const denom = tasksDone + tasksOpen;
  const completionRate = denom === 0 ? 0 : Math.round((tasksDone / denom) * 100);

  return {
    tasksCreated,
    tasksDone,
    tasksOpen,
    eventsCount,
    voiceCaptures,
    completionRate,
  };
}

export function buildSummary(
  metrics: WeeklyMetrics,
  weekStart: Date,
  weekEnd: Date,
): { summary: string; highlights: WeeklyHighlight[] } {
  const range = `${format(weekStart, "d MMM", { locale: pt })} – ${format(weekEnd, "d MMM yyyy", { locale: pt })}`;
  const highlights: WeeklyHighlight[] = [];

  if (metrics.tasksDone > 0) {
    highlights.push({
      kind: "win",
      text: `Concluíste ${metrics.tasksDone} tarefa${metrics.tasksDone === 1 ? "" : "s"} esta semana.`,
    });
  }
  if (metrics.tasksOpen > 0) {
    highlights.push({
      kind: "focus",
      text: `Ficam ${metrics.tasksOpen} em aberto — começa pela mais urgente.`,
    });
  } else {
    highlights.push({
      kind: "win",
      text: "Inbox limpa. Bom trabalho.",
    });
  }
  if (metrics.voiceCaptures > 0) {
    highlights.push({
      kind: "tip",
      text: `Usaste a captura por voz ${metrics.voiceCaptures}× — continua, é a forma mais rápida.`,
    });
  } else {
    highlights.push({
      kind: "tip",
      text: "Experimenta a captura por voz: «cria tarefa…» ou «marca reunião amanhã às 15».",
    });
  }

  const summary = [
    `Semana ${range}.`,
    `Criaste ${metrics.tasksCreated} tarefas, concluíste ${metrics.tasksDone} (${metrics.completionRate}% de ritmo),`,
    `com ${metrics.eventsCount} evento${metrics.eventsCount === 1 ? "" : "s"} no calendário`,
    `e ${metrics.voiceCaptures} captura${metrics.voiceCaptures === 1 ? "" : "s"} por voz.`,
  ].join(" ");

  return { summary, highlights };
}

export async function generateWeeklyReport(userId: string, reference = new Date()) {
  const { weekStart, weekEnd } = weekBounds(reference);
  const metrics = await computeWeeklyMetrics(userId, reference);
  const { summary, highlights } = buildSummary(metrics, weekStart, weekEnd);

  return prisma.weeklyReport.upsert({
    where: {
      userId_weekStart: { userId, weekStart },
    },
    create: {
      userId,
      weekStart,
      weekEnd,
      summary,
      highlights,
      metrics,
    },
    update: {
      weekEnd,
      summary,
      highlights,
      metrics,
    },
  });
}

export async function getOrCreateCurrentReport(userId: string) {
  return generateWeeklyReport(userId, new Date());
}

export async function getPreviousReport(userId: string) {
  const prev = subWeeks(new Date(), 1);
  const { weekStart } = weekBounds(prev);
  return prisma.weeklyReport.findUnique({
    where: { userId_weekStart: { userId, weekStart } },
  });
}

export async function listReports(userId: string, limit = 8) {
  return prisma.weeklyReport.findMany({
    where: { userId },
    orderBy: { weekStart: "desc" },
    take: limit,
  });
}

export const reportsModule = {
  meta: { id: "REPORTS" as const, label: "Relatórios" },
  computeWeeklyMetrics,
  generateWeeklyReport,
  getOrCreateCurrentReport,
  listReports,
};
