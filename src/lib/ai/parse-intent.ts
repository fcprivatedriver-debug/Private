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
    n.match(/(?:gastei|gasto|paguei|custou|recebi|ganhei|poupei|poupar)\s+(\d+(?:[.,]\d{1,2})?)/) ||
    n.match(/\b(\d+(?:[.,]\d{1,2})?)\s*(?:no|na|em|ao|a)\b/);
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
  { match: /galp/, store: "Galp", category: "combustivel" },
  { match: /repsol/, store: "Repsol", category: "combustivel" },
  { match: /prio/, store: "Prio", category: "combustivel" },
  { match: /uber|bolt|tvde/, store: "TVDE", category: "tvde" },
  { match: /netflix|spotify|ginasio/, store: "Subscrição", category: "lazer" },
  { match: /restaurante|cafe|almoco|jantar/, store: "Restaurante", category: "restaurantes" },
  { match: /supermercado|compras/, store: "Supermercado", category: "supermercado" },
];

function detectExplicitScope(n: string): FinanceScope | null {
  if (/(para casa|da casa|conta familiar|familiar|partilhad|compras para casa)/.test(n)) return "FAMILY";
  if (/(pessoal|para mim|minhas financas|do meu bolso)/.test(n)) return "PERSONAL";
  return null;
}

export function parseMoneyIntent(raw: string): ParsedMoneyIntent {
  const n = normalize(raw);

  if (/sempre que/.test(n) && /(regista|coloca|mete|considera)/.test(n)) {
    return { kind: "memory_rule", raw };
  }

  const euros = extractAmountEuros(raw);
  if (euros == null) return null;
  const amountCents = eurosToCents(euros);
  const explicitScope = detectExplicitScope(n);

  if (/(poupei|poupar|guardei|meter na poupanca|para as ferias|para o objetivo)/.test(n)) {
    let goalHint: string | undefined;
    if (/ferias|viagem|algarve/.test(n)) goalHint = "férias";
    else if (/carro/.test(n)) goalHint = "carro";
    else if (/emergencia|fundo/.test(n)) goalHint = "emergência";
    return {
      kind: "save",
      amountCents,
      goalHint,
      description: raw.trim(),
      explicitScope,
    };
  }

  if (/(recebi|ganhei|entrou|salario|ordenado|reembolso)/.test(n)) {
    const categoryHint = /salario|ordenado/.test(n)
      ? "salario"
      : /reembolso/.test(n)
        ? "reembolsos"
        : "receita-outros";
    return {
      kind: "income",
      amountCents,
      categoryHint,
      description: raw.trim(),
      explicitScope: explicitScope ?? "PERSONAL",
    };
  }

  if (/(gastei|gasto|paguei|custou|fui (a|ao)|comprei|saida)/.test(n) || / no | na | em /.test(n)) {
    const hit = STORE_CATEGORY.find((s) => s.match.test(n));
    // café pequeno → pessoal por defeito no parser
    const cafe = /\bcafe\b|\bcafé\b/.test(n) && euros <= 8;
    return {
      kind: "expense",
      amountCents,
      storeName: hit?.store ?? (cafe ? "Café" : undefined),
      categoryHint: hit?.category ?? (cafe ? "restaurantes" : "outros"),
      description: hit ? hit.store : cafe ? "Café" : raw.trim().slice(0, 120),
      explicitScope: explicitScope ?? (cafe ? "PERSONAL" : null),
    };
  }

  return null;
}
