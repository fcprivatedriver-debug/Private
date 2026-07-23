import { eurosToCents } from "@/lib/money";

export type ParsedMoneyIntent =
  | {
      kind: "expense";
      amountCents: number;
      storeName?: string;
      categoryHint?: string;
      description: string;
    }
  | {
      kind: "income";
      amountCents: number;
      categoryHint?: string;
      description: string;
    }
  | {
      kind: "save";
      amountCents: number;
      goalHint?: string;
      description: string;
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

/** Extrai valor em euros de frases PT: "35 €", "35 euros", "35,50", "18€" */
function extractAmountEuros(raw: string): number | null {
  const n = normalize(raw).replace(/\s*€\s*/g, " euro ");
  const m =
    n.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:euros?|eur)\b/) ||
    n.match(/(?:gastei|gasto|paguei|custou|recebi|ganhei|poupei|poupar)\s+(\d+(?:[.,]\d{1,2})?)/) ||
    n.match(/\b(\d+(?:[.,]\d{1,2})?)\s*(?:no|na|em|ao|à|a)\b/);
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
  { match: /farmacia|farmácia/, store: "Farmácia", category: "farmacia" },
  { match: /galp/, store: "Galp", category: "combustivel" },
  { match: /repsol/, store: "Repsol", category: "combustivel" },
  { match: /prio/, store: "Prio", category: "combustivel" },
  { match: /uber|bolt|tvde/, store: "TVDE", category: "transportes" },
  { match: /netflix|spotify|ginasio|ginásio/, store: "Subscrição", category: "lazer" },
  { match: /restaurante|cafe|café|almoco|almoço|jantar/, store: "Restaurante", category: "restaurantes" },
  { match: /supermercado|compras/, store: "Supermercado", category: "supermercado" },
];

/**
 * Interpreta registos falados/escritos à Nina.
 * Ex.: "gastei 35 € no Continente" · "fui à farmácia e gastei 18 €"
 */
export function parseMoneyIntent(raw: string): ParsedMoneyIntent {
  const n = normalize(raw);
  const euros = extractAmountEuros(raw);
  if (euros == null) return null;
  const amountCents = eurosToCents(euros);

  if (/(poupei|poupar|guardei|meter|meter na poupanca|para as ferias|para o objetivo)/.test(n)) {
    let goalHint: string | undefined;
    if (/ferias|viagem|algarve/.test(n)) goalHint = "férias";
    else if (/carro/.test(n)) goalHint = "carro";
    else if (/emergencia|fundo/.test(n)) goalHint = "emergência";
    return {
      kind: "save",
      amountCents,
      goalHint,
      description: raw.trim(),
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
    };
  }

  if (/(gastei|gasto|paguei|custou|fui (a|à|ao)|comprei|saida|saída)/.test(n) || / no | na | em /.test(n)) {
    const hit = STORE_CATEGORY.find((s) => s.match.test(n));
    return {
      kind: "expense",
      amountCents,
      storeName: hit?.store,
      categoryHint: hit?.category ?? "outros",
      description: hit
        ? `${hit.store}`
        : raw.trim().slice(0, 120),
    };
  }

  return null;
}
