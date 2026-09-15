import { eurosToCents } from "@/lib/money";
import type { FinanceScope } from "@prisma/client";

export type ParsedMoneyIntent =
  | {
      kind: "expense";
      amountCents: number;
      storeName?: string;
      categoryHint?: string;
      description: string;
      explicitScope?: FinanceScope | null;
      paymentHint?: string;
    }
  | {
      kind: "income";
      amountCents: number;
      categoryHint?: string;
      description: string;
      explicitScope?: FinanceScope | null;
    }
  | {
      kind: "save";
      amountCents: number;
      goalHint?: string;
      description: string;
      explicitScope?: FinanceScope | null;
    }
  | {
      kind: "shopping_add";
      /** Texto do produto (ex.: «seis litros de leite Vigor meio gordo») */
      productQuery: string;
      quantityHint?: string;
    }
  | {
      kind: "shopping_trip";
    }
  | {
      kind: "mobility";
      mode: "fuel" | "ev" | "auto";
      utterance: string;
      batteryPercent?: number;
      budgetEuros?: number;
    }
  | {
      kind: "calendar_book";
      title: string;
      dayHint?: "today" | "tomorrow";
      preferredHour?: number;
    }
  | {
      kind: "calendar_confirm";
      hour: number;
      minute?: number;
      title?: string;
      dayHint?: "today" | "tomorrow";
    }
  | {
      kind: "reminder";
      title: string;
      when: Date;
    }
  | {
      kind: "navigate";
      destination: string;
    }
  | {
      kind: "today_briefing";
    }
  | {
      kind: "savings_query";
    }
  | {
      kind: "spend_less";
    }
  | {
      kind: "memory_rule";
      raw: string;
    }
  | {
      kind: "need_amount";
      hint: string;
    }
  | null;

function normalize(q: string): string {
  return q
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[?!.;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAmountEuros(raw: string): number | null {
  const n = normalize(raw).replace(/\s*€\s*/g, " euro ");
  const m =
    n.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:euros?|eur)\b/) ||
    n.match(
      /(?:gastei|gasto|paguei|custou|recebi|ganhei|poupei|poupar|coloca|reserva|acrescenta|mete|transfere|abasteci)\s+(\d+(?:[.,]\d{1,2})?)/,
    ) ||
    n.match(/,\s*(\d+(?:[.,]\d{1,2})?)\b/) ||
    n.match(/\b(\d+(?:[.,]\d{1,2})?)\s*(?:no|na|em|ao|a)\b/) ||
    n.match(/\b(\d+(?:[.,]\d{1,2})?)$/);
  if (!m) return null;
  const euros = Number(m[1].replace(",", "."));
  if (!Number.isFinite(euros) || euros <= 0) return null;
  return euros;
}

const STORE_CATEGORY: { match: RegExp; store: string; category: string }[] = [
  { match: /\bbp\b|posto\s*bp/, store: "BP", category: "combustivel" },
  { match: /continente/, store: "Continente", category: "supermercado" },
  { match: /pingo\s*doce/, store: "Pingo Doce", category: "supermercado" },
  { match: /lidl/, store: "Lidl", category: "supermercado" },
  { match: /mercadona/, store: "Mercadona", category: "supermercado" },
  { match: /auchan|jumbo/, store: "Auchan", category: "supermercado" },
  { match: /farmacia/, store: "Farmácia", category: "farmacia" },
  { match: /mcdonald|mcdonalds/, store: "McDonald's", category: "restaurantes" },
  { match: /galp/, store: "Galp", category: "combustivel" },
  { match: /repsol/, store: "Repsol", category: "combustivel" },
  { match: /prio/, store: "Prio", category: "combustivel" },
  { match: /abasteci|gasoleo|gasolina|combustivel/, store: "Combustível", category: "combustivel" },
  { match: /uber|bolt|tvde/, store: "TVDE", category: "tvde" },
  { match: /netflix|spotify|ginasio/, store: "Subscrição", category: "lazer" },
  { match: /eletricidade|edp|luz/, store: "Eletricidade", category: "luz" },
  { match: /\bagua\b|epal/, store: "Água", category: "agua" },
  { match: /\bgas\b/, store: "Gás", category: "gas" },
  { match: /restaurante|cafe|almoco|jantar/, store: "Restaurante", category: "restaurantes" },
  { match: /supermercado|compras/, store: "Supermercado", category: "supermercado" },
];

function detectExplicitScope(n: string): FinanceScope | null {
  if (/(para casa|da casa|conta familiar|familiar|partilhad|compras para casa)/.test(n)) return "FAMILY";
  if (/(empresa|profissional|cliente|tvde)/.test(n)) return "PERSONAL";
  if (/(pessoal|para mim|minhas financas|do meu bolso)/.test(n)) return "PERSONAL";
  return null;
}

function detectPayment(n: string): string | undefined {
  if (/mb\s*way|mbway/.test(n)) return "MB_WAY";
  if (/revolut/.test(n)) return "REVOLUT";
  if (/credito|crédito/.test(n)) return "CREDIT_CARD";
  if (/debito|débito|cartao|cartão/.test(n)) return "DEBIT_CARD";
  if (/numerario|dinheiro|cash/.test(n)) return "CASH";
  if (/transferencia|transferência/.test(n)) return "TRANSFER";
  return undefined;
}

function parseReminderWhen(n: string): Date | null {
  const now = new Date();
  const wordHours: Record<string, number> = {
    uma: 1,
    duas: 2,
    tres: 3,
    três: 3,
    quatro: 4,
  };
  const inHours =
    n.match(/daqui a (\d+)\s*(hora|horas|h)\b/) ||
    n.match(/daqui a (uma|duas|tres|três|quatro)\s*(hora|horas|h)\b/);
  if (inHours) {
    const raw = inHours[1];
    const hrs = /^\d+$/.test(raw) ? Number(raw) : wordHours[raw] ?? 1;
    return new Date(now.getTime() + hrs * 3600_000);
  }
  const inMins = n.match(/daqui a (\d+)\s*(minuto|minutos|min)\b/);
  if (inMins) {
    return new Date(now.getTime() + Number(inMins[1]) * 60_000);
  }
  const hm = n.match(/(?:as|às)\s+(\d{1,2})(?::(\d{2}))?/);
  const hour = hm ? Number(hm[1]) : 9;
  const minute = hm?.[2] ? Number(hm[2]) : 0;
  const d = new Date(now);
  if (/amanha|amanhã/.test(n)) d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  if (d.getTime() <= now.getTime() && !/amanha|amanhã/.test(n)) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

export function parseMoneyIntent(raw: string): ParsedMoneyIntent {
  const n = normalize(raw);

  if (/sempre que/.test(n) && /(regista|coloca|mete|considera)/.test(n)) {
    return { kind: "memory_rule", raw };
  }

  // Today briefing
  if (
    /(o que importa hoje|o que tenho hoje|resumo de hoje|bom dia nina|hoje tens)/.test(n) ||
    /^(hoje|briefing|o meu dia)\b/.test(n)
  ) {
    return { kind: "today_briefing" };
  }

  // Saving Engine
  if (
    /(quanto poupei|quanto poupamos|poupanca da nina|poupança da nina|quanto ja poupei|quanto já poupei|graças à nina|gracas a nina)/.test(
      n,
    )
  ) {
    return { kind: "savings_query" };
  }

  if (
    /(como (posso |posso )?gastar menos|reduzir despesas|onde posso poupar|poupar (mais )?este mes|poupar (mais )?este mês)/.test(
      n,
    )
  ) {
    return { kind: "spend_less" };
  }

  // Lembretes — serviço do sistema (nunca duplicar app de reminders)
  if (/\blembr[ae]-?me\b|\blembrat[e]\b|\blembrete\b/.test(n)) {
    const when = parseReminderWhen(n);
    let title = n
      .replace(/nina[, ]*/g, "")
      .replace(/\blembr[ae]-?me\b|\blembrat[e]\b|\blembrete\b/g, " ")
      .replace(
        /\b(hoje|amanha|amanhã|daqui a (?:\d+|uma|duas|tres|três|quatro)\s*(?:hora|horas|h|minuto|minutos|min)|(?:as|às)\s*\d{1,2}(?::\d{2})?)\b/g,
        " ",
      )
      .replace(/\b(para|de|do|da)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!title || title.length < 2) title = "Lembrete";
    return { kind: "reminder", title, when: when ?? new Date(Date.now() + 3600_000) };
  }

  // Calendário — confirmar hora
  const confirmHour = n.match(
    /(?:marca(?:r)?|agenda(?:r)?|poe|põe|mete)\s+(?:para\s+)?(?:as|às)\s+(\d{1,2})(?::(\d{2}))?/,
  );
  if (confirmHour && !/cabeleireiro|medico|médico|reuniao|reunião|dentista/.test(n.split("as")[0] || "")) {
    // "marca para as 15" sem título novo
    if (/marca(?:r)?\s+para\s+(?:as|às)/.test(n) || /agenda(?:r)?\s+para\s+(?:as|às)/.test(n)) {
      return {
        kind: "calendar_confirm",
        hour: Number(confirmHour[1]),
        minute: confirmHour[2] ? Number(confirmHour[2]) : 0,
        dayHint: /hoje/.test(n) ? "today" : "tomorrow",
      };
    }
  }

  // Calendário — marcar compromisso
  if (
    /(preciso de marcar|marca(?:r)?|agenda(?:r)?)\s+/.test(n) &&
    !/lembra/.test(n)
  ) {
    let title = n
      .replace(/nina[, ]*/g, "")
      .replace(/(preciso de marcar|marcar|marca|agendar|agenda)\s+/g, " ")
      .replace(/\b(amanha|amanhã|hoje|por favor)\b/g, " ")
      .replace(/\b(as|às)\s+\d{1,2}(?::\d{2})?\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!title) title = "Compromisso";
    const hourMatch = n.match(/(?:as|às)\s+(\d{1,2})/);
    // Se já tem hora explícita com título → confirm directo
    if (hourMatch && /(marca(?:r)?|agenda(?:r)?).{0,40}(as|às)\s+\d/.test(n) && title.length >= 2) {
      const day = new Date();
      if (/amanha|amanhã/.test(n)) day.setDate(day.getDate() + 1);
      return {
        kind: "calendar_confirm",
        hour: Number(hourMatch[1]),
        title,
        dayHint: /hoje/.test(n) ? "today" : "tomorrow",
      };
    }
    return {
      kind: "calendar_book",
      title,
      dayHint: /hoje/.test(n) ? "today" : "tomorrow",
      preferredHour: hourMatch ? Number(hourMatch[1]) : undefined,
    };
  }

  // Navegação
  if (/\bleva-?me\b|\bnavega\b|\bcaminho para\b|\bleva para\b/.test(n)) {
    let destination = n
      .replace(/nina[, ]*/g, "")
      .replace(/\b(leva-?me|navega|caminho para|leva para|para a|para o|ao|à|a)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!destination) destination = "reunião";
    return { kind: "navigate", destination };
  }

  // Mobilidade — combustível / EV (antes de compras "onde compensa")
  if (
    /(onde abastec|onde (devo |posso )?abastec|posto mais barato|onde compensa colocar|colocar \d+\s*€|gasolina|diesel|gasoleo)/.test(
      n,
    ) ||
    /(onde (devo |posso )?carregar|tenho \d+\s*%|bateria|carregar ate|carregar até|supercharger|posto de carregamento)/.test(
      n,
    )
  ) {
    const battery =
      n.match(/(\d+)\s*%/)?.[1] || n.match(/(\d+)\s*(?:de\s+)?bateria/)?.[1];
    const budget = n.match(/(\d+(?:[.,]\d+)?)\s*€/)?.[1];
    const mode: "fuel" | "ev" | "auto" = /bateria|carregar|supercharger|eletrico|eléctrico/.test(n)
      ? "ev"
      : /abastec|gasolina|diesel|gasoleo|posto|colocar/.test(n)
        ? "fuel"
        : "auto";
    return {
      kind: "mobility",
      mode,
      utterance: raw.trim(),
      batteryPercent: battery ? Number(battery) : undefined,
      budgetEuros: budget ? Number(budget.replace(",", ".")) : undefined,
    };
  }

  // Compras — sem valor monetário
  if (
    /(vou\s+as\s+compras|vou\s+às\s+compras|ir\s+as\s+compras|ir\s+às\s+compras|comparar\s+supermercado|onde\s+compens)/.test(
      n,
    )
  ) {
    return { kind: "shopping_trip" };
  }

  const needMatch = n.match(
    /(?:nina[, ]*)?(?:preciso de|preciso|falta(?:-me)?|compra)\s+(.+)/i,
  );
  const addMatch = n.match(
    /(?:nina[, ]*)?(?:adiciona|mete|poe|põe|coloca|mete\s+na\s+lista|lista)\s+(.+)/i,
  );
  if (
    addMatch ||
    needMatch ||
    (/(adiciona|mete|poe|põe|preciso)/.test(n) &&
      /(leite|manteiga|cafe|café|banana|pao|pão|ovos|fruta|agua|água)/.test(n))
  ) {
    let productQuery = (
      addMatch?.[1] ||
      needMatch?.[1] ||
      n.replace(/nina[, ]*/g, "").replace(/^(adiciona|mete|poe|põe|coloca|preciso de|preciso|compra)\s+/, "")
    ).trim();
    productQuery = productQuery
      .replace(/\b(a|na|na lista|lista de compras|por favor)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (productQuery.length >= 2) {
      const qty =
        productQuery.match(/^(\d+|um|uma|dois|duas|tres|três|quatro|cinco|seis|sete|oito|nove|dez)\s+/i)?.[1] ||
        undefined;
      return { kind: "shopping_add", productQuery, quantityHint: qty };
    }
  }

  const euros = extractAmountEuros(raw);
  const explicitScope = detectExplicitScope(n);
  const paymentHint = detectPayment(n);

  if (/(recebi|ganhei|entrou|salario|ordenado|reembolso)/.test(n)) {
    const categoryHint = /salario|ordenado/.test(n)
      ? "salario"
      : /reembolso/.test(n)
        ? "reembolsos"
        : "receita-outros";
    if (euros == null) {
      return { kind: "need_amount", hint: "Quanto foi? Diz o valor (ex.: recebi o salário, 1850 euros)." };
    }
    return {
      kind: "income",
      amountCents: eurosToCents(euros),
      categoryHint,
      description: raw.trim(),
      explicitScope: explicitScope ?? "PERSONAL",
    };
  }

  if (euros == null) return null;
  const amountCents = eurosToCents(euros);

  if (
    /(poupei|poupar|guardei|meter na poupanca)/.test(n) ||
    /(coloca|reserva|acrescenta|mete|transfere).{0,40}(ferias|viagem|objetivo|poupanca|fundo|emergencia|carro|casa|reforma|estudo|algarve)/.test(
      n,
    ) ||
    /(para as ferias|para o objetivo|nas ferias|no fundo)/.test(n)
  ) {
    let goalHint: string | undefined;
    if (/ferias|viagem|algarve/.test(n)) goalHint = "férias";
    else if (/carro/.test(n)) goalHint = "carro";
    else if (/emergencia|fundo/.test(n)) goalHint = "emergência";
    else if (/casa|entrada/.test(n)) goalHint = "casa";
    else if (/estudo|educacao|educação/.test(n)) goalHint = "estudo";
    else if (/reforma/.test(n)) goalHint = "reforma";
    else {
      const m = n.match(/(?:nas?|para(?:\s+o|\s+a)?|ao)\s+([a-zà-ú\s]{3,40})$/);
      if (m) goalHint = m[1].trim();
    }
    return {
      kind: "save",
      amountCents,
      goalHint,
      description: raw.trim(),
      explicitScope,
    };
  }

  const hit = STORE_CATEGORY.find((s) => s.match.test(n));
  const cafe = /\bcafe\b|\bcafé\b/.test(n) && euros <= 8;
  const looksExpense =
    /(gastei|gasto|paguei|custou|fui (a|ao)|comprei|saida|abasteci)/.test(n) ||
    / no | na | em /.test(n) ||
    Boolean(hit) ||
    cafe ||
    /,\s*\d/.test(n);

  if (looksExpense) {
    return {
      kind: "expense",
      amountCents,
      storeName: hit?.store ?? (cafe ? "Café" : undefined),
      categoryHint: hit?.category ?? (cafe ? "restaurantes" : "outros"),
      description: hit ? hit.store : cafe ? "Café" : raw.trim().slice(0, 120),
      explicitScope: explicitScope ?? (cafe ? "PERSONAL" : null),
      paymentHint,
    };
  }

  return null;
}
