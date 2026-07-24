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

export function parseMoneyIntent(raw: string): ParsedMoneyIntent {
  const n = normalize(raw);

  if (/sempre que/.test(n) && /(regista|coloca|mete|considera)/.test(n)) {
    return { kind: "memory_rule", raw };
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
