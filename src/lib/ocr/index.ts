/**
 * OCR de faturas — arquitetura preparada para motor real (Vision / Tesseract / API).
 * Em modo demo devolve dados simulados reconhecidos a partir do nome do ficheiro ou placeholder.
 */

export type OcrLineItem = {
  name: string;
  quantity: number;
  unitCents: number;
  totalCents: number;
  vatRate?: number;
};

export type OcrResult = {
  storeName: string;
  date: string; // ISO date
  totalCents: number;
  vatCents: number;
  suggestedCategorySlug: string;
  items: OcrLineItem[];
  confidence: number;
  rawText: string;
};

const STORE_HINTS: { match: RegExp; store: string; category: string }[] = [
  { match: /continente/i, store: "Continente", category: "supermercado" },
  { match: /pingo\s*doce/i, store: "Pingo Doce", category: "supermercado" },
  { match: /lidl/i, store: "Lidl", category: "supermercado" },
  { match: /mercadona/i, store: "Mercadona", category: "supermercado" },
  { match: /auchan|jumbo/i, store: "Auchan", category: "supermercado" },
  { match: /repsol/i, store: "Repsol", category: "combustivel" },
  { match: /galp/i, store: "Galp", category: "combustivel" },
  { match: /prio/i, store: "Prio", category: "combustivel" },
  { match: /farmacia|farmácia/i, store: "Farmácia", category: "farmacia" },
  { match: /mcdonald|burger|restaurante/i, store: "Restaurante", category: "restaurantes" },
];

export async function recognizeReceipt(input: {
  fileName?: string;
  hintText?: string;
}): Promise<OcrResult> {
  const text = `${input.fileName ?? ""} ${input.hintText ?? ""}`;
  const hint = STORE_HINTS.find((h) => h.match.test(text));

  const storeName = hint?.store ?? "Loja reconhecida";
  const suggestedCategorySlug = hint?.category ?? "outros";
  const totalCents = 2487;
  const vatCents = 456;

  return {
    storeName,
    date: new Date().toISOString().slice(0, 10),
    totalCents,
    vatCents,
    suggestedCategorySlug,
    confidence: hint ? 0.92 : 0.71,
    rawText: text || "OCR simulado — confirme os dados da fatura.",
    items: [
      { name: "Produto A", quantity: 1, unitCents: 1299, totalCents: 1299, vatRate: 23 },
      { name: "Produto B", quantity: 2, unitCents: 594, totalCents: 1188, vatRate: 6 },
    ],
  };
}
