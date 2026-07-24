import { formatEUR, currentYearMonth, monthBounds, monthLabel } from "@/lib/money";
import { goalProgress } from "@/domain/finance";
import {
  NATURAL_EXAMPLES,
  pickCelebration,
  resolveVoicePrefs,
  shapeLength,
  type NinaVoicePrefs,
  DEFAULT_VOICE,
} from "@/lib/ai/personality";

export type NinaContext = {
  userName: string;
  householdName?: string;
  memberCount?: number;
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
  recentExpenses: {
    description: string;
    storeName: string | null;
    amountCents: number;
    category: string;
    memberName?: string | null;
  }[];
  monthLabel: string;
  voice?: NinaVoicePrefs;
};

export type NinaReply = {
  text: string;
  tone: "warm" | "celebrate" | "careful" | "neutral";
  suggestions?: string[];
  didMutate?: boolean;
  pendingScope?: unknown;
};

const SUGGESTIONS = [
  ...NATURAL_EXAMPLES,
  "Gastei 85 € no Continente para casa",
  "Quanto gastei este mês?",
  "Onde posso poupar?",
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
  return (
    goals.find((g) => n.includes(normalize(g.name))) ??
    (/(ferias|férias|viagem|algarve)/i.test(q)
      ? goals.find((g) => /ferias|viagem|algarve/i.test(g.name))
      : undefined) ??
    (/(carro|auto)/i.test(q) ? goals.find((g) => /carro|auto/i.test(g.name)) : undefined) ??
    (/(emergencia|emergência|fundo)/i.test(q)
      ? goals.find((g) => /emerg|fundo/i.test(g.name))
      : undefined) ??
    goals[0]
  );
}

function withVoice(text: string, tone: NinaReply["tone"], ctx: NinaContext, suggestions?: string[]): NinaReply {
  return {
    text: shapeLength(text, ctx.voice ?? DEFAULT_VOICE),
    tone,
    suggestions,
  };
}

export function greeting(ctx: NinaContext): NinaReply {
  const name = firstName(ctx.userName);
  const balance = ctx.incomeCents - ctx.expenseCents;
  const familyBit =
    (ctx.memberCount ?? 1) > 1
      ? `\n\nEstão ${ctx.memberCount} pessoas na conta “${ctx.householdName ?? "partilhada"}”. Tudo o que registarem fica sincronizado.`
      : "";
  const calm =
    balance >= 0
      ? `Este mês ainda tens ${formatEUR(balance)} de folga.`
      : `Este mês as despesas passaram um pouco as receitas (${formatEUR(Math.abs(balance))}). Vamos olhar para isso com calma — juntos.`;

  return withVoice(
    `Olá, ${name}. Sou a Nina — a tua assistente financeira, sem stress e sem julgamentos.\n\n${calm}${familyBit}\n\nFala comigo como falarias com uma amiga. Por exemplo: “gastei 22 euros na BP” ou “quanto me resta para supermercado?”.`,
    balance >= 0 ? "warm" : "careful",
    ctx,
    SUGGESTIONS.slice(0, 4),
  );
}

export function answerNina(question: string, ctx: NinaContext): NinaReply {
  const q = normalize(question);
  const name = firstName(ctx.userName);
  const balance = ctx.incomeCents - ctx.expenseCents;
  const budgetLeft = Math.max(0, (ctx.budgetLimitCents || ctx.incomeCents) - ctx.expenseCents);
  const daily = ctx.daysLeftInMonth > 0 ? Math.floor(budgetLeft / ctx.daysLeftInMonth) : budgetLeft;
  const stress = budgetLeft <= 0 || balance < 0;

  // Quanto me resta para [categoria]
  if (/quanto.*(resta|sobra|fica|posso).*(para|no|na)/.test(q) || /resta para|sobra para/.test(q)) {
    const cat =
      matchCategory(question, ctx.categoryBreakdown) ||
      ctx.categoryBreakdown.find((c) => /super|aliment/i.test(c.name));
    const catSpent = cat?.cents ?? 0;
    const softBudget = Math.max(0, Math.round(budgetLeft * 0.35));
    if (/super|continente|compras|aliment/.test(q)) {
      return withVoice(
        cat
          ? `${name}, em supermercado já foram ${formatEUR(catSpent)} este mês.\n\nCom a folga atual, sugiro não passar de cerca de ${formatEUR(softBudget)} nas próximas compras — se fizer sentido para ti.`
          : `Ainda não vi compras de supermercado este mês. Com a folga de ${formatEUR(budgetLeft)}, tens margem — eu aviso se a coisa apertar.`,
        "warm",
        ctx,
        ["Onde foi o meu dinheiro esta semana?", "Consigo ir jantar fora este fim de semana?"],
      );
    }
    return withVoice(
      `Olhando para o plano, ainda tens cerca de ${formatEUR(budgetLeft)} até ao fim do mês` +
        (cat ? ` (em ${cat.name} já gastaste ${formatEUR(catSpent)})` : "") +
        `.\n\nDiz-me a categoria e eu afino melhor o número.`,
      "warm",
      ctx,
    );
  }

  // Onde foi o dinheiro esta semana
  if (/onde foi|para onde foi|onde andou|esta semana|desta semana/.test(q)) {
    const lines = ctx.categoryBreakdown
      .slice(0, 5)
      .map((c, i) => `${i + 1}. ${c.name}: ${formatEUR(c.cents)}`)
      .join("\n");
    const top = ctx.categoryBreakdown[0];
    const humor =
      !stress && ctx.voice?.humor !== "off" && top && /super|restaurant/i.test(top.name)
        ? `\n\n${/super/i.test(top.name) ? "Hoje o supermercado ganhou outra vez." : "A mesa também pediu a palavra este mês."}`
        : "";
    return withVoice(
      `${name}, deixa-me mostrar com simplicidade para onde foi o dinheiro em ${ctx.monthLabel}:\n\n${lines || "Ainda sem movimentos recentes."}${humor}\n\nSem culpas — só clareza.`,
      "warm",
      ctx,
      ["Quanto me resta para supermercado?", "Onde posso poupar?"],
    );
  }

  // Consigo ir jantar fora?
  if (/jantar|sair a jantar|restaurante|fim de semana|fds/.test(q) && /(consigo|posso|da|dá|vale)/.test(q)) {
    const dinnerBudget = Math.min(budgetLeft, daily * 2);
    if (budgetLeft <= 1500 || dinnerBudget < 2000) {
      return withVoice(
        `${name}, este fim de semana o orçamento está um pouco apertado.\n\nNão é um “não” definitivo — talvez um jantar mais simples ou em casa também conte. Se quiseres, encontramos uma opção leve juntos.`,
        "careful",
        ctx,
        ["Quanto posso gastar até ao final do mês?", "Onde posso poupar?"],
      );
    }
    return withVoice(
      `Sim — com calma. Ainda tens cerca de ${formatEUR(budgetLeft)} no plano.\n\nUm jantar até cerca de ${formatEUR(Math.min(dinnerBudget, 4500))} cabe bem sem estragar o mês. Divirtam-se; eu trato das contas.`,
      "celebrate",
      ctx,
      ["Gastei 35 euros no restaurante", "Quanto me resta para supermercado?"],
    );
  }

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
            ? `${pickCelebration()} Gastaste ${formatEUR(Math.abs(delta))} a menos. Estás no caminho certo.`
            : `Os gastos estão muito parecidos com o mês passado — estabilidade também é uma vitória.`
      }`,
      tone: more ? "careful" : "celebrate",
      suggestions: ["Onde posso poupar?", "Quanto gastei este mês?"],
    };
  }

  // Objetivos / férias / simulações
  if (
    /se eu poupar|se aumentar|se retirar|quando atingo|simul/.test(q) ||
    (/poupar/.test(q) && /mes|mês|objetivo/.test(q))
  ) {
    const goal = matchGoal(question, ctx.goals);
    if (!goal) {
      return {
        text: `Ainda não tenho um objetivo para simular. Cria um em Objetivos ou Poupanças e volta a perguntar.`,
        tone: "warm",
        suggestions: ["Quanto falta para as férias?"],
      };
    }
    const left = Math.max(0, goal.targetCents - goal.currentCents);
    const monthlyMatch = q.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:euros?|eur)?/);
    const monthly = monthlyMatch ? Math.round(Number(monthlyMatch[1].replace(",", ".")) * 100) : 15000;
    const months = monthly > 0 ? Math.ceil(left / monthly) : null;
    return {
      text: goal
        ? `Para “${goal.name}” faltam ${formatEUR(left)}.\n\nSe poupares ${formatEUR(monthly)} por mês, chegas em cerca de ${months ?? "—"} ${months === 1 ? "mês" : "meses"}.\n\nSe aumentares 50 €/mês, o prazo encolhe. Queres que eu faça outra simulação?`
        : "Sem objetivo.",
      tone: "warm",
      suggestions: ["Quanto falta para as férias?", "Onde posso poupar?"],
    };
  }

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
  return withVoice(
    `Estou aqui, ${name}. Fala comigo naturalmente — sem comandos especiais.\n\nPor exemplo:\n• “Gastei 22 euros na BP”\n• “Coloca 50 euros nas férias”\n• “Quanto me resta para supermercado?”\n• “Onde foi o meu dinheiro esta semana?”\n• “Consigo ir jantar fora este fim de semana?”`,
    "warm",
    ctx,
    SUGGESTIONS.slice(0, 4),
  );
}

export function buildNinaContextFromRaw(input: {
  userName: string;
  householdName?: string;
  memberCount?: number;
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
  recentExpenses: {
    description: string;
    storeName: string | null;
    amountCents: number;
    category: string;
    memberName?: string | null;
  }[];
  voice?: NinaVoicePrefs;
  recentQuestion?: string;
  ninaReplyStyle?: string | null;
  ninaHumor?: string | null;
}): NinaContext {
  const { year, month } = currentYearMonth();
  const { end } = monthBounds(year, month);
  const daysLeft = Math.max(0, end.getUTCDate() - new Date().getDate());
  const voice =
    input.voice ??
    resolveVoicePrefs({
      replyStyle: input.ninaReplyStyle,
      humor: input.ninaHumor,
      recentQuestion: input.recentQuestion,
    });
  return {
    userName: input.userName,
    householdName: input.householdName,
    memberCount: input.memberCount,
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
    voice,
  };
}

export { SUGGESTIONS as NINA_SUGGESTIONS, resolveVoicePrefs };
