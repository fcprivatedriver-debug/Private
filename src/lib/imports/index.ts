import type { ImportProvider } from "@prisma/client";

/**
 * Camada de importação automática.
 * Cada provider tem um adaptador; APIs reais ligam-se aqui sem alterar a UI.
 */

export type ImportedExpenseDraft = {
  amountCents: number;
  date: string;
  description: string;
  storeName?: string;
  categorySlug?: string;
  paymentMethod?: string;
  notes?: string;
};

export type ImportAdapter = {
  provider: ImportProvider;
  label: string;
  supportsOAuth: boolean;
  /** Liga conta (OAuth / API key) — stub */
  connect?: () => Promise<{ ok: boolean; message: string }>;
  /** Importa despesas recentes — stub / parser */
  fetchRecent?: () => Promise<ImportedExpenseDraft[]>;
  parseFile?: (content: string, fileName: string) => Promise<ImportedExpenseDraft[]>;
};

function demoDrafts(store: string, categorySlug: string): ImportedExpenseDraft[] {
  const today = new Date();
  return [
    {
      amountCents: 3245,
      date: today.toISOString().slice(0, 10),
      description: `Compra ${store}`,
      storeName: store,
      categorySlug,
      paymentMethod: "DEBIT_CARD",
    },
  ];
}

export const importAdapters: Partial<Record<ImportProvider, ImportAdapter>> = {
  CONTINENTE: {
    provider: "CONTINENTE",
    label: "Continente",
    supportsOAuth: true,
    connect: async () => ({ ok: true, message: "Pronto para autorização Continente (em breve)." }),
    fetchRecent: async () => demoDrafts("Continente", "supermercado"),
  },
  PINGO_DOCE: {
    provider: "PINGO_DOCE",
    label: "Pingo Doce",
    supportsOAuth: true,
    connect: async () => ({ ok: true, message: "Pronto para autorização Pingo Doce (em breve)." }),
    fetchRecent: async () => demoDrafts("Pingo Doce", "supermercado"),
  },
  LIDL_PLUS: {
    provider: "LIDL_PLUS",
    label: "Lidl Plus",
    supportsOAuth: true,
    fetchRecent: async () => demoDrafts("Lidl", "supermercado"),
  },
  MERCADONA: {
    provider: "MERCADONA",
    label: "Mercadona",
    supportsOAuth: true,
    fetchRecent: async () => demoDrafts("Mercadona", "supermercado"),
  },
  AUCHAN: {
    provider: "AUCHAN",
    label: "Auchan",
    supportsOAuth: true,
    fetchRecent: async () => demoDrafts("Auchan", "supermercado"),
  },
  REPSOL: {
    provider: "REPSOL",
    label: "Repsol",
    supportsOAuth: true,
    fetchRecent: async () => demoDrafts("Repsol", "combustivel"),
  },
  GALP: {
    provider: "GALP",
    label: "Galp",
    supportsOAuth: true,
    fetchRecent: async () => demoDrafts("Galp", "combustivel"),
  },
  PRIO: {
    provider: "PRIO",
    label: "Prio",
    supportsOAuth: true,
    fetchRecent: async () => demoDrafts("Prio", "combustivel"),
  },
  VIA_VERDE: {
    provider: "VIA_VERDE",
    label: "Via Verde",
    supportsOAuth: true,
    fetchRecent: async () => demoDrafts("Via Verde", "transportes"),
  },
  TESLA: {
    provider: "TESLA",
    label: "Tesla",
    supportsOAuth: true,
    fetchRecent: async () => demoDrafts("Tesla Supercharger", "carregamentos-eletricos"),
  },
  MB_WAY: {
    provider: "MB_WAY",
    label: "MB Way",
    supportsOAuth: true,
    fetchRecent: async () => demoDrafts("MB Way", "outros"),
  },
  REVOLUT: {
    provider: "REVOLUT",
    label: "Revolut",
    supportsOAuth: true,
    fetchRecent: async () => demoDrafts("Revolut", "outros"),
  },
  OPEN_BANKING: {
    provider: "OPEN_BANKING",
    label: "Open Banking PT",
    supportsOAuth: true,
    connect: async () => ({
      ok: true,
      message: "Arquitetura preparada para PSD2 / Open Banking com bancos portugueses.",
    }),
  },
  PDF: {
    provider: "PDF",
    label: "Importar PDF",
    supportsOAuth: false,
    parseFile: async () => demoDrafts("Fatura PDF", "outros"),
  },
  CSV: {
    provider: "CSV",
    label: "Importar CSV",
    supportsOAuth: false,
    parseFile: async (content) => {
      const lines = content.split(/\r?\n/).filter(Boolean).slice(1);
      return lines.slice(0, 50).map((line) => {
        const [date, description, amount] = line.split(/[;,]/);
        const euros = Number(String(amount ?? "0").replace(",", "."));
        return {
          date: date || new Date().toISOString().slice(0, 10),
          description: description || "Linha CSV",
          amountCents: Math.round(Math.abs(euros) * 100),
          categorySlug: "outros",
        };
      });
    },
  },
  EMAIL: {
    provider: "EMAIL",
    label: "Email com faturas",
    supportsOAuth: true,
    connect: async () => ({
      ok: true,
      message: "Leitura de emails com faturas mediante autorização (futuro).",
    }),
  },
};

export function getImportAdapter(provider: ImportProvider): ImportAdapter | null {
  return importAdapters[provider] ?? null;
}
