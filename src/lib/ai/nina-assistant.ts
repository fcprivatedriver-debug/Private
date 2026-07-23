import { formatEUR, currentYearMonth, monthBounds, monthLabel } from "@/lib/money";
import { goalProgress } from "@/domain/finance";

export type NinaContext = {
  userName: string;
  incomeCents: number;
  expenseCents: number;
  prevExpenseCents: number;
  prevIncomeCents: number;
  budgetLimitCents: number;
  daysLeftInMonth: number;
  categoryBreakdown: { name: string; cents: number; slug?: string }[];
  storeBreakdown: { name: string; cents: number }[];
  goals: { name: string; currentCents: number; targetCents: number }[];
  upcomingPayments: { name: string; amountCents: number; dueLabel: string }[];
  unusual: { description: string; amountCents: number }[];
  recentExpenses: { description: string; storeName: string | null; amountCents: number; category: string }[];
  monthLabel: string;
};

export type NinaReply = {
  text: string;
  tone: "warm" | "celebrate" | "careful" | "neutral";
  suggestions?: string[];
};

const SUGGESTIONS = [
  "Quanto gastei este mês?",
  "Quanto posso gastar até ao final do mês?",
  "Onde posso poupar?",
  "Compara este mês com o anterior",
  "Quanto falta para as férias?",
  "Mostra as despesas do supermercado",
];

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "aí";
}

function normalize(q: string): string {
  return q
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[?!.,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchCategory(q: string, cats: NinaContext["categoryBreakdown"]) {
  const n = normalize(q);
  return cats.find((c) => {
    const cn = normalize(c.name);
    return n.includes(cn) || (c.slug && n.includes(c.slug.replace(/-/g, " ")));
  });
}

function matchGoal(q: string, goals: NinaContext["goals"]) {
  const n = normalize(q);
  return goals.find((g) => n.includes(normalize(g.name)))
    ?? (/(ferias|férias|viagem|algarve)/i.test(q) ? goals.find((g) => /ferias|viagem|algarve/i.test(g.name)) : undefined)
    ?? (/(carro|auto)/i.test(q) ? goals.find((g) => /carro|auto/i.test(g.name)) : undefined)
    ?? (/(emergencia|emergência|fundo)/i.test(q) ? goals.find((g) => /emerg|fundo/i.test(g.name)) : undefined)
    ?? goals[0];
}

export function greeting(ctx: NinaContext): NinaReply {
  const name = firstName(ctx.userName);
  const balance = ctx.incomeCents - ctx.expenseCents;
  const calm =
    balance >= 0
      ? `Este mês ainda tens ${formatEUR(balance)} de folga.`
      : `Este mês as despesas já ultrapassaram as receitas em ${formatEUR(Math.abs(balance))}. Vamos olhar para isso com calma.`;

  return {
    text: `Olá, ${name}. Sou a Nina — estou aqui para te ajudar com o dinheiro, sem stress.\n\n${calm}\n\nPergunta-me o que quiseres, como se estivéssemos a conversar.`,
    tone: balance >= 0 ? "warm" : "careful",
    suggestions: SUGGESTIONS.slice(0, 4),
  };
}

export function answerNina(question: string, ctx: NinaContext): NinaReply {
  const q = normalize(question);
  const name = firstName(ctx.userName);
  const balance = ctx.incomeCents - ctx.expenseCents;
  const budgetLeft = Math.max(0, (ctx.budgetLimitCents || ctx.incomeCents) - ctx.expenseCents);
  const daily = ctx.daysLeftInMonth > 0 ? Math.floor(budgetLeft / ctx.daysLeftInMonth) : budgetLeft;

  // Quanto gastei
  if (/(quanto|o que).*(gastei|gaste|despes)/.test(q) || /^despesas?( deste)? mes$/.test(q)) {
    const top = ctx.categoryBreakdown[0];
    return {
      text: `${name}, este mês (${ctx.monthLabel}) já gastaste ${formatEUR(ctx.expenseCents)}.\n\n${
        top
          ? `A maior fatia foi ${top.name} (${formatEUR(top.cents)}).`
          : "Ainda não tenho despesas registadas."
      }\n\nSe quiseres, posso mostrar uma categoria específica — por exemplo o supermercado.`,
      tone: "neutral",
      suggestions: ["Mostra as despesas do supermercado", "Onde posso poupar?", "Compara este mês com o anterior"],
    };
  }

  // Quanto posso gastar
  if (/(quanto|o que).*(posso|posso ainda).*(gast|sobra|falta)/.test(q) || /ate ao final do mes/.test(q)) {
    if (budgetLeft <= 0) {
      return {
        text: `${name}, com o ritmo atual o orçamento do mês já está esgotado.\n\nNão te preocupes — vamos ajustar juntos. Posso sugerir onde cortar um pouco sem estragar o essencial.`,
        tone: "careful",
        suggestions: ["Onde posso poupar?", "Mostra as despesas do supermercado"],
      };
    }
    return {
      text: `Boa pergunta. Até ao fim do mês podes gastar cerca de ${formatEUR(budgetLeft)} sem sair do plano.\n\nIsso dá mais ou menos ${formatEUR(daily)} por dia, nos próximos ${ctx.daysLeftInMonth} dias.\n\nQueres que eu te diga onde estás a gastar mais?`,
      tone: "warm",
      suggestions: ["Onde posso poupar?", "Quanto gastei este mês?"],
    };
  }

  // Onde poupar
  if (/onde.*(poupar|cortar|reduzir)/.test(q) || /sugest.*(poup|economia)/.test(q) || /como.*(poupar)/.test(q)) {
    const tips = ctx.categoryBreakdown.slice(0, 3);
    const lines = tips.map(
      (t, i) =>
        `${i + 1}. ${t.name} — ${formatEUR(t.cents)}. Uma pequena redução aqui já ajuda.`,
    );
    const unusual = ctx.unusual[0];
    return {
      text: `${name}, olhei para os teus hábitos com carinho — sem julgamentos.\n\nOnde faz mais sentido ajustar agora:\n${lines.join("\n")}${
        unusual
          ? `\n\nTambém notei algo fora do habitual: “${unusual.description}” (${formatEUR(unusual.amountCents)}). Vale a pena confirmar se foi pontual.`
          : ""
      }\n\nPequenos passos contam. Queres criar um objetivo de poupança?`,
      tone: "warm",
      suggestions: ["Quanto falta para as férias?", "Compara este mês com o anterior"],
    };
  }

  // Comparar meses
  if (/compara/.test(q) || /mes (anterior|passado)/.test(q) || /versus|vs/.test(q)) {
    const delta = ctx.expenseCents - ctx.prevExpenseCents;
    const more = delta > 0;
    return {
      text: `Comparei ${ctx.monthLabel} com o mês anterior.\n\nDespesas agora: ${formatEUR(ctx.expenseCents)}\nMês passado: ${formatEUR(ctx.prevExpenseCents)}\n\n${
        more
          ? `Gastaste ${formatEUR(delta)} a mais. Não é um problema — é informação. Podemos ver juntos o que mudou.`
          : delta < 0
            ? `Boa notícia: gastaste ${formatEUR(Math.abs(delta))} a menos. Estás no caminho certo.`
            : `Os gastos estão muito parecidos com o mês passado — estabilidade também é uma vitória.`
      }`,
      tone: more ? "careful" : "celebrate",
      suggestions: ["Onde posso poupar?", "Quanto gastei este mês?"],
    };
  }

  // Objetivos / férias
  if (/objetivo|meta|falta para|poupan/.test(q) || /ferias|carro|emergencia|reforma|casa/.test(q)) {
    const goal = matchGoal(question, ctx.goals);
    if (!goal) {
      return {
        text: `Ainda não tens objetivos de poupança. Queres que criemos um juntos? Pode ser férias, um fundo de emergência ou o que for importante para ti.`,
        tone: "warm",
        suggestions: ["Onde posso poupar?"],
      };
    }
    const left = Math.max(0, goal.targetCents - goal.currentCents);
    const pct = goalProgress(goal.currentCents, goal.targetCents);
    return {
      text: `Para “${goal.name}” já tens ${formatEUR(goal.currentCents)} de ${formatEUR(goal.targetCents)} (${pct}%).\n\nFaltam ${formatEUR(left)}.\n\n${
        pct >= 70
          ? "Estás tão perto — continua com o mesmo ritmo. Eu acredito em ti."
          : "Vamos a poucos, mas vamos. Cada euro conta e eu ajudo-te a manter o foco."
      }`,
      tone: pct >= 50 ? "celebrate" : "warm",
      suggestions: ["Quanto posso gastar até ao final do mês?", "Onde posso poupar?"],
    };
  }

  // Categoria específica / supermercado
  const cat = matchCategory(question, ctx.categoryBreakdown);
  if (cat || /supermercado|continente|pingo doce|restaurante|combustivel|lazer/.test(q)) {
    const target =
      cat ||
      ctx.categoryBreakdown.find((c) => /super|aliment/i.test(c.name)) ||
      ctx.categoryBreakdown[0];
    if (!target) {
      return {
        text: `Ainda não tenho despesas nessa categoria este mês. Quando registares compras, eu organizo tudo automaticamente.`,
        tone: "warm",
        suggestions: SUGGESTIONS.slice(0, 3),
      };
    }
    const related = ctx.recentExpenses.filter((e) =>
      normalize(e.category).includes(normalize(target.name).slice(0, 6)),
    );
    const list = related
      .slice(0, 5)
      .map((e) => `• ${e.storeName || e.description}: ${formatEUR(e.amountCents)}`)
      .join("\n");
    return {
      text: `Em ${target.name} gastaste ${formatEUR(target.cents)} este mês.\n\n${
        list || "Ainda sem detalhe recente."
      }\n\nQueres que compare com o mês passado ou que sugira uma poupança nesta área?`,
      tone: "neutral",
      suggestions: ["Onde posso poupar?", "Compara este mês com o anterior"],
    };
  }

  // Receitas / saldo
  if (/receit|salario|saldo|sobrou|sobra/.test(q)) {
    return {
      text: `Receitas deste mês: ${formatEUR(ctx.incomeCents)}.\nDespesas: ${formatEUR(ctx.expenseCents)}.\nSaldo: ${formatEUR(balance)}.\n\n${
        balance >= 0
          ? "Há margem — se quiseres, posso ajudar a encaminhar uma parte para um objetivo."
          : "Estamos um pouco no vermelho. Vamos encontrar ajustes suaves, sem drama."
      }`,
      tone: balance >= 0 ? "warm" : "careful",
      suggestions: ["Quanto posso gastar até ao final do mês?", "Onde posso poupar?"],
    };
  }

  // Pagamentos futuros
  if (/pagament|conta|renda|proxima|próxima|vencer|a pagar/.test(q)) {
    if (!ctx.upcomingPayments.length) {
      return {
        text: `Neste momento não tenho pagamentos futuros agendados. Se quiseres, podemos marcar a renda, a luz ou as subscrições para eu te avisar a tempo.`,
        tone: "warm",
      };
    }
    const lines = ctx.upcomingPayments
      .slice(0, 5)
      .map((p) => `• ${p.name}: ${formatEUR(p.amountCents)} · ${p.dueLabel}`)
      .join("\n");
    return {
      text: `${name}, estes são os próximos pagamentos que estou a acompanhar:\n\n${lines}\n\nEu aviso-te com antecedência para não haver surpresas.`,
      tone: "warm",
      suggestions: ["Quanto posso gastar até ao final do mês?"],
    };
  }

  // Para onde vai o dinheiro
  if (/para onde|onde vai|onde esta a ir|explic/.test(q)) {
    const lines = ctx.categoryBreakdown
      .slice(0, 5)
      .map((c, i) => `${i + 1}. ${c.name}: ${formatEUR(c.cents)}`)
      .join("\n");
    return {
      text: `Deixa-me explicar com simplicidade para onde está a ir o dinheiro em ${ctx.monthLabel}:\n\n${lines || "Ainda sem movimentos."}\n\nO dinheiro deve servir a tua vida — não o contrário. Diz-me se queres aprofundar alguma linha.`,
      tone: "warm",
      suggestions: ["Onde posso poupar?", "Mostra as despesas do supermercado"],
    };
  }

  // Default
  return {
    text: `Estou aqui, ${name}. Podes perguntar-me coisas como:\n\n• Quanto gastei este mês?\n• Quanto posso gastar até ao final do mês?\n• Onde posso poupar?\n• Compara este mês com o anterior\n• Quanto falta para o meu objetivo\n\nFala comigo como falarias com uma amiga que trata das contas por ti.`,
    tone: "warm",
    suggestions: SUGGESTIONS.slice(0, 4),
  };
}

export function buildNinaContextFromRaw(input: {
  userName: string;
  incomeCents: number;
  expenseCents: number;
  prevExpenseCents: number;
  prevIncomeCents: number;
  budgetLimitCents: number;
  categoryBreakdown: { name: string; cents: number; slug?: string }[];
  storeBreakdown: { name: string; cents: number }[];
  goals: { name: string; currentCents: number; targetCents: number }[];
  upcomingPayments: { name: string; amountCents: number; due: Date }[];
  unusual: { description: string; amountCents: number }[];
  recentExpenses: { description: string; storeName: string | null; amountCents: number; category: string }[];
}): NinaContext {
  const { year, month } = currentYearMonth();
  const { end } = monthBounds(year, month);
  const daysLeft = Math.max(0, end.getUTCDate() - new Date().getDate());
  return {
    userName: input.userName,
    incomeCents: input.incomeCents,
    expenseCents: input.expenseCents,
    prevExpenseCents: input.prevExpenseCents,
    prevIncomeCents: input.prevIncomeCents,
    budgetLimitCents: input.budgetLimitCents,
    daysLeftInMonth: daysLeft || 1,
    categoryBreakdown: input.categoryBreakdown,
    storeBreakdown: input.storeBreakdown,
    goals: input.goals,
    upcomingPayments: input.upcomingPayments.map((p) => ({
      name: p.name,
      amountCents: p.amountCents,
      dueLabel: p.due.toLocaleDateString("pt-PT"),
    })),
    unusual: input.unusual,
    recentExpenses: input.recentExpenses,
    monthLabel: monthLabel(year, month),
  };
}

export { SUGGESTIONS as NINA_SUGGESTIONS };
