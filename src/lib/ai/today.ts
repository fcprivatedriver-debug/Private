import { prisma } from "@/lib/db";
import { startOfDay, endOfDay, addDays } from "date-fns";
import { compareBasket } from "@/lib/products";
import { calendarService } from "@/lib/calendar";
import { decideMobility } from "@/lib/mobility/decision";
import { getMobilityPrefs } from "@/lib/learning/preferences";
import { formatEUR } from "@/lib/money";
import { savingEngine } from "@/lib/engines/saving-engine";

export type TodayInsight = {
  kind: "meeting" | "expense" | "shopping" | "mobility" | "tip";
  text: string;
  href?: string;
};

export type TodayBriefing = {
  greeting: string;
  headline: string;
  insights: TodayInsight[];
  spokenSummary: string;
};

/**
 * Today Screen — responde a «O que importa hoje?»
 * Combina calendário externo, finanças, compras e mobilidade.
 */
export async function buildTodayBriefing(
  familyId: string,
  userId: string,
): Promise<TodayBriefing> {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia." : hour < 19 ? "Boa tarde." : "Boa noite.";

  const insights: TodayInsight[] = [];
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  // Calendário — provider externo (nunca calendário privado Nina)
  try {
    const provider = calendarService.getProvider();
    const events = await provider.listEvents(dayStart, addDays(dayEnd, 1));
    const next = events.find((e) => e.start >= now) ?? events.find((e) => e.end > now);
    if (next) {
      const time = next.start.toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
      });
      insights.push({
        kind: "meeting",
        text: `Tens ${next.title} às ${time}.`,
        href: "/pt/calendario",
      });

      const prefs = await getMobilityPrefs(familyId, userId);
      const battery = prefs.typicalBatteryPct ?? (prefs.fuelType === "electric" ? 29 : null);
      if (battery != null && battery < 40) {
        insights.push({
          kind: "mobility",
          text: `Com a bateria atual (~${battery}%), aconselho um carregamento de 15 minutos antes de saíres.`,
          href: "/pt/mobilidade",
        });
      }
      const depart = new Date(next.start.getTime() - 40 * 60_000);
      const departLabel = depart.toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
      });
      insights.push({
        kind: "tip",
        text: `Recomendo saíres às ${departLabel} para chegares a tempo.`,
      });
    } else {
      insights.push({
        kind: "meeting",
        text: "Agenda livre por agora — liga o Google Calendar para a Nina ver os teus eventos.",
        href: "/pt/calendario",
      });
    }
  } catch {
    /* ignore */
  }

  // Despesas hoje
  const expenseCount = await prisma.expense.count({
    where: { familyId, date: { gte: dayStart, lte: dayEnd } },
  });
  if (expenseCount === 0) {
    insights.push({
      kind: "expense",
      text: "Ainda não registaste despesas hoje.",
      href: "/pt/captura",
    });
  } else {
    insights.push({
      kind: "expense",
      text: `Já registaste ${expenseCount} despesa${expenseCount === 1 ? "" : "s"} hoje.`,
      href: "/pt/transacoes",
    });
  }

  // Compras — poupança estimada
  try {
    const list = await prisma.shoppingList.findFirst({
      where: { familyId },
      include: { items: { where: { isChecked: false } } },
      orderBy: { updatedAt: "desc" },
    });
    if (list && list.items.length > 0) {
      const comparison = await compareBasket(list.items.map((i) => i.name));
      if (comparison.best && comparison.savingsCents >= 100) {
        insights.push({
          kind: "shopping",
          text: `Poupas cerca de ${formatEUR(comparison.savingsCents)} nas compras se fores ao ${comparison.best.storeName}.`,
          href: "/pt/lista",
        });
      } else {
        insights.push({
          kind: "shopping",
          text: `Tens ${list.items.length} itens na lista de compras.`,
          href: "/pt/lista",
        });
      }
    }
  } catch {
    /* ignore */
  }

  // Mobilidade — se ainda sem insight
  if (!insights.some((i) => i.kind === "mobility")) {
    const prefs = await getMobilityPrefs(familyId, userId);
    const battery = prefs.typicalBatteryPct;
    if (battery != null && battery < 35) {
      try {
        const decision = await decideMobility({
          kind: "ev",
          utterance: `tenho ${battery}% de bateria`,
          batteryPercent: battery,
          preferredEvNetworks: prefs.evNetwork ? [prefs.evNetwork] : undefined,
        });
        insights.push({
          kind: "mobility",
          text: decision.reply.split("\n")[0],
          href: "/pt/mobilidade",
        });
      } catch {
        insights.push({
          kind: "mobility",
          text: `Tens ${battery}% de bateria. Diz «Nina onde devo carregar?»`,
          href: "/pt/mobilidade",
        });
      }
    }
  }

  // Saving Engine whisper (sem novo ecrã)
  try {
    const whisper = await savingEngine.todaySavingsWhisper(familyId);
    if (whisper) {
      insights.push({
        kind: "tip",
        text: whisper,
        href: "/pt/dashboard",
      });
    }
  } catch {
    /* ignore */
  }

  const spokenSummary = [greeting, "Hoje tens:", ...insights.map((i) => i.text)].join(" ");

  return {
    greeting,
    headline: "O que importa hoje",
    insights: insights.slice(0, 6),
    spokenSummary,
  };
}
