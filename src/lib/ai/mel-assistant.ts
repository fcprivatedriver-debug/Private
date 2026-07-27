import { prisma } from "@/lib/db";
import { ensureMelCore } from "@/core/bootstrap";
import { routeUtterance } from "@/core/router";
import { listToday } from "@/modules/calendar/service";
import { getOrCreateCurrentReport } from "@/modules/reports/service";

/**
 * Assistente Mel — respostas via router de intenções (capabilities).
 */
export async function melReply(userId: string, message: string): Promise<string> {
  ensureMelCore();
  const text = message.trim();
  const lower = text.toLowerCase();

  if (/^(ol[aá]|oi|bom dia|boa tarde|boa noite)\b/i.test(text)) {
    const routed = await routeUtterance(userId, "quais as tarefas para hoje");
    const events = await listToday(userId);
    const parts = ["Olá! Sou a Mel."];
    if (events.length) {
      parts.push(
        `Hoje tens ${events.length} compromisso${events.length === 1 ? "" : "s"} — o primeiro é «${events[0]!.title}».`,
      );
    }
    parts.push(routed.reply);
    return parts.join(" ");
  }

  if (/relat[oó]rio|resumo semanal/i.test(lower)) {
    const report = await getOrCreateCurrentReport(userId);
    return report.summary;
  }

  const routed = await routeUtterance(userId, text);
  return routed.reply;
}

export async function saveExchange(userId: string, userText: string, assistantText: string) {
  await prisma.melMessage.createMany({
    data: [
      { userId, role: "USER", content: userText },
      { userId, role: "ASSISTANT", content: assistantText },
    ],
  });
}

export async function recentMessages(userId: string, limit = 12) {
  const rows = await prisma.melMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.reverse();
}
