import { formatEUR } from "@/lib/money";
import {
  softenBudgetMessage,
  softenCategorySpike,
  pickCelebration,
  type NinaVoicePrefs,
  DEFAULT_VOICE,
  shapeLength,
} from "@/lib/ai/personality";

export type FinanceSnapshot = {
  incomeCents: number;
  expenseCents: number;
  prevExpenseCents: number;
  categoryBreakdown: { name: string; cents: number }[];
  unusualExpenses: { description: string; amountCents: number; avgCents: number }[];
  budgetUsedPercent: number;
  daysLeftInMonth: number;
};

export type AiSuggestion = {
  kind: string;
  title: string;
  body: string;
  severity: "info" | "success" | "warning" | "danger";
};

/** Motor heurístico de insights — tom humano, sem culpas. */
export function generateInsights(
  snap: FinanceSnapshot,
  prefs: NinaVoicePrefs = DEFAULT_VOICE,
): AiSuggestion[] {
  const out: AiSuggestion[] = [];
  const balance = snap.incomeCents - snap.expenseCents;
  const burnPerDay =
    snap.daysLeftInMonth > 0
      ? snap.expenseCents / Math.max(1, 30 - snap.daysLeftInMonth)
      : 0;
  const projected = snap.expenseCents + burnPerDay * snap.daysLeftInMonth;
  const projectedBalance = snap.incomeCents - projected;
  const stress = snap.budgetUsedPercent >= 90 || projectedBalance < 0;

  out.push({
    kind: "forecast",
    title: "Olhar para o fim do mês",
    body: shapeLength(
      projectedBalance >= 0
        ? `Com o ritmo atual, estimas ficar com cerca de ${formatEUR(Math.round(projectedBalance))} — bom sinal.`
        : `Com o ritmo atual, o mês pode ficar um pouco apertado. Vamos olhar juntos para onde compensar — sem stress.`,
      prefs,
    ),
    severity: projectedBalance >= 0 ? "success" : "warning",
  });

  if (snap.prevExpenseCents > 0) {
    const delta = snap.expenseCents - snap.prevExpenseCents;
    const pct = Math.round((delta / snap.prevExpenseCents) * 100);
    out.push({
      kind: "month_compare",
      title: "Comparação com o mês passado",
      body:
        delta > 0
          ? shapeLength(
              `Este mês gastaste ${formatEUR(delta)} a mais (+${pct}%) do que no mês passado. Não é um problema — é informação. Se quiseres, vemos juntos o que mudou.`,
              prefs,
            )
          : shapeLength(
              `${pickCelebration()} Gastaste ${formatEUR(Math.abs(delta))} a menos (${pct}%) do que no mês passado.`,
              prefs,
            ),
      severity: delta > 0 ? "warning" : "success",
    });
  }

  const top = snap.categoryBreakdown[0];
  if (top) {
    out.push({
      kind: "habit",
      title: `Onde foi mais dinheiro: ${top.name}`,
      body: shapeLength(
        `${top.name} leva ${formatEUR(top.cents)} este mês. ${
          stress
            ? softenCategorySpike(top.name)
            : prefs.humor === "light" && /super|restaurant/i.test(top.name)
              ? "Hoje o supermercado (ou a mesa) ganhou outra vez — eu trato da organização."
              : "Se quiseres, ajudo a encontrar um equilíbrio suave."
        }`,
        prefs,
      ),
      severity: "info",
    });
  }

  for (const u of snap.unusualExpenses.slice(0, 3)) {
    out.push({
      kind: "anomaly",
      title: "Algo fora do habitual",
      body: shapeLength(
        `Notei “${u.description}” (${formatEUR(u.amountCents)}), acima da tua média (${formatEUR(u.avgCents)}). Queres confirmar se está correta? Sem julgamento — só clareza.`,
        prefs,
      ),
      severity: "warning",
    });
  }

  if (snap.budgetUsedPercent >= 75) {
    const soft = softenBudgetMessage(snap.budgetUsedPercent);
    out.push({
      kind: "budget",
      title: soft.title,
      body: shapeLength(soft.body, prefs),
      severity: snap.budgetUsedPercent >= 100 ? "danger" : "warning",
    });
  }

  if (balance > 0) {
    out.push({
      kind: "save",
      title: "Há folga — boa oportunidade",
      body: shapeLength(
        `Tens cerca de ${formatEUR(balance)} de margem. Se fizer sentido, podes pôr ${formatEUR(Math.round(balance * 0.2))} de lado num objetivo — só se quiseres.`,
        prefs,
      ),
      severity: "success",
    });
  }

  return out;
}

export function buildMonthlyReport(snap: FinanceSnapshot): string {
  const lines = [
    "Resumo do mês · Nina",
    `Receitas: ${formatEUR(snap.incomeCents)}`,
    `Despesas: ${formatEUR(snap.expenseCents)}`,
    `Saldo: ${formatEUR(snap.incomeCents - snap.expenseCents)}`,
    "",
    "Por categoria:",
    ...snap.categoryBreakdown.map((c) => `• ${c.name}: ${formatEUR(c.cents)}`),
    "",
    "Sem culpas — só clareza para decidires com calma.",
  ];
  return lines.join("\n");
}
