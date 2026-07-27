import { prisma } from "@/lib/db";
import { listTasks } from "@/modules/tasks/service";
import { listToday } from "@/modules/calendar/service";
import { processVoiceCapture } from "@/modules/voice/service";
import { getOrCreateCurrentReport } from "@/modules/reports/service";

/**
 * Assistente Mel — respostas heurísticas em PT-PT.
 * Sem acoplamento a um LLM: pode trocar-se o provider depois.
 */
export async function melReply(userId: string, message: string): Promise<string> {
  const text = message.trim();
  const lower = text.toLowerCase();

  if (/^(ol[aá]|oi|bom dia|boa tarde|boa noite)\b/i.test(text)) {
    const tasks = await listTasks(userId, { status: "TODO", limit: 3 });
    const events = await listToday(userId);
    const first = tasks[0];
    const parts = ["Olá! Sou a Mel."];
    if (events.length) {
      parts.push(
        `Hoje tens ${events.length} compromisso${events.length === 1 ? "" : "s"} — o primeiro é «${events[0]!.title}».`,
      );
    } else {
      parts.push("O calendário de hoje está livre.");
    }
    if (first) {
      parts.push(`Na lista: «${first.title}». Queres que avance nisso?`);
    } else {
      parts.push("Não há tarefas pendentes. Diz «cria tarefa…» quando quiseres.");
    }
    return parts.join(" ");
  }

  if (/relat[oó]rio|resumo|semana/i.test(lower)) {
    const report = await getOrCreateCurrentReport(userId);
    return report.summary;
  }

  if (/o que (tenho|h[aá]) (para )?fazer|tarefas|pendente/i.test(lower)) {
    const open = await listTasks(userId, { limit: 5 });
    const pending = open.filter((t) => t.status === "TODO" || t.status === "IN_PROGRESS");
    if (!pending.length) return "Não tens tarefas em aberto. Bom sinal.";
    const lines = pending.map((t, i) => `${i + 1}. ${t.title}`).join("\n");
    return `Aqui está o que está em aberto:\n${lines}`;
  }

  if (/hoje|agenda|calend[aá]rio/i.test(lower)) {
    const events = await listToday(userId);
    if (!events.length) return "Hoje não tens eventos marcados.";
    const lines = events
      .map((e) => {
        const t = e.startsAt.toLocaleTimeString("pt-PT", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return `• ${t} — ${e.title}`;
      })
      .join("\n");
    return `Agenda de hoje:\n${lines}`;
  }

  // Tenta captura por voz/texto (criar tarefa/evento)
  const capture = await processVoiceCapture(userId, text);
  if (capture.ok) return capture.reply;
  if (capture.intent !== "UNKNOWN") return capture.reply;

  return (
    capture.reply ||
    "Posso criar tarefas, marcar eventos ou mostrar o relatório semanal. Experimenta «cria tarefa comprar pão»."
  );
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
