import { formatEUR } from "@/lib/money";

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

/** Motor heurístico de IA financeira (substituível por LLM). */
export function generateInsights(snap: FinanceSnapshot): AiSuggestion[] {
  const out: AiSuggestion[] = [];
  const balance = snap.incomeCents - snap.expenseCents;
  const burnPerDay =
    snap.daysLeftInMonth > 0
      ? snap.expenseCents / Math.max(1, 30 - snap.daysLeftInMonth)
      : 0;
  const projected = snap.expenseCents + burnPerDay * snap.daysLeftInMonth;
  const projectedBalance = snap.incomeCents - projected;

  out.push({
    kind: "forecast",
    title: "Previsão de saldo no final do mês",
    body: `Com o ritmo atual, o saldo estimado é ${formatEUR(Math.round(projectedBalance))}.`,
    severity: projectedBalance >= 0 ? "success" : "warning",
  });

  if (snap.prevExpenseCents > 0) {
    const delta = snap.expenseCents - snap.prevExpenseCents;
    const pct = Math.round((delta / snap.prevExpenseCents) * 100);
    out.push({
      kind: "month_compare",
      title: "Comparação com o mês anterior",
      body:
        delta > 0
          ? `Gastou ${formatEUR(delta)} a mais (+${pct}%) face ao mês passado.`
          : `Gastou ${formatEUR(Math.abs(delta))} a menos (${pct}%) face ao mês passado.`,
      severity: delta > 0 ? "warning" : "success",
    });
  }

  const top = snap.categoryBreakdown[0];
  if (top) {
    out.push({
      kind: "habit",
      title: "Hábito de consumo principal",
      body: `${top.name} representa ${formatEUR(top.cents)} este mês. Reveja se há margem para poupar.`,
      severity: "info",
    });
  }

  for (const u of snap.unusualExpenses.slice(0, 3)) {
    out.push({
      kind: "anomaly",
      title: "Despesa fora do normal",
      body: `“${u.description}” (${formatEUR(u.amountCents)}) está acima da média habitual (${formatEUR(u.avgCents)}).`,
      severity: "warning",
    });
  }

  if (snap.budgetUsedPercent >= 75) {
    out.push({
      kind: "budget",
      title: "Orçamento sob pressão",
      body: `Já utilizou ${snap.budgetUsedPercent}% do orçamento mensal. Priorize categorias essenciais.`,
      severity: snap.budgetUsedPercent >= 100 ? "danger" : "warning",
    });
  }

  if (balance > 0) {
    out.push({
      kind: "save",
      title: "Sugestão de poupança",
      body: `Tem ${formatEUR(balance)} disponíveis. Considere transferir 20% (${formatEUR(Math.round(balance * 0.2))}) para um objetivo.`,
      severity: "success",
    });
  }

  return out;
}

export function buildMonthlyReport(snap: FinanceSnapshot): string {
  const lines = [
    "Relatório financeiro Nina",
    `Receitas: ${formatEUR(snap.incomeCents)}`,
    `Despesas: ${formatEUR(snap.expenseCents)}`,
    `Saldo: ${formatEUR(snap.incomeCents - snap.expenseCents)}`,
    "",
    "Por categoria:",
    ...snap.categoryBreakdown.map((c) => `• ${c.name}: ${formatEUR(c.cents)}`),
  ];
  return lines.join("\n");
}
