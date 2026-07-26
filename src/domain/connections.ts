import type { AutomationLevel, ConnectionKind, ImportProvider } from "@prisma/client";

export type ConnectionCatalogItem = {
  key: string;
  label: string;
  kind: ConnectionKind;
  description: string;
  /** Liga ao adaptador de importação quando existir */
  importProvider?: ImportProvider;
  /** Preparado para o futuro (ainda sem sync demo) */
  comingSoon?: boolean;
};

/** Catálogo de módulos opcionais — a Nina nunca obriga a ligar nenhum. */
export const CONNECTION_CATALOG: ConnectionCatalogItem[] = [
  {
    key: "open_banking",
    label: "Contas bancárias (Open Banking)",
    kind: "BANKING",
    description: "Importar movimentos bancários com autorização PSD2.",
    importProvider: "OPEN_BANKING",
  },
  {
    key: "credit_card",
    label: "Cartões de crédito",
    kind: "CARD",
    description: "Extratos e compras do cartão, quando autorizares.",
    comingSoon: true,
  },
  {
    key: "revolut",
    label: "Revolut",
    kind: "WALLET",
    description: "Carteira e cartão Revolut.",
    importProvider: "REVOLUT",
  },
  {
    key: "mb_way",
    label: "MB Way",
    kind: "WALLET",
    description: "Pagamentos e transferências MB Way.",
    importProvider: "MB_WAY",
  },
  {
    key: "paypal",
    label: "PayPal",
    kind: "WALLET",
    description: "Compras e recebimentos PayPal.",
    comingSoon: true,
  },
  {
    key: "gmail",
    label: "Gmail",
    kind: "EMAIL",
    description: "Ler faturas e recibos autorizados na caixa de correio.",
    importProvider: "EMAIL",
  },
  {
    key: "outlook",
    label: "Outlook",
    kind: "EMAIL",
    description: "Faturas e recibos no Outlook / Microsoft 365.",
    importProvider: "EMAIL",
  },
  {
    key: "email_other",
    label: "Outro email",
    kind: "EMAIL",
    description: "Qualquer caixa de correio com faturas autorizadas.",
    importProvider: "EMAIL",
  },
  {
    key: "at",
    label: "Autoridade Tributária",
    kind: "TAX",
    description: "Quando tecnicamente possível — impostos e recibos verdes.",
    comingSoon: true,
  },
  {
    key: "via_verde",
    label: "Via Verde",
    kind: "AUTO",
    description: "Portagens e estacionamentos.",
    importProvider: "VIA_VERDE",
  },
  {
    key: "continente",
    label: "Continente",
    kind: "RETAIL",
    description: "Compras e cartão Continente.",
    importProvider: "CONTINENTE",
  },
  {
    key: "pingo_doce",
    label: "Pingo Doce",
    kind: "RETAIL",
    description: "Compras Pingo Doce.",
    importProvider: "PINGO_DOCE",
  },
  {
    key: "lidl",
    label: "Lidl Plus",
    kind: "RETAIL",
    description: "Compras Lidl.",
    importProvider: "LIDL_PLUS",
  },
  {
    key: "mercadona",
    label: "Mercadona",
    kind: "RETAIL",
    description: "Compras Mercadona.",
    importProvider: "MERCADONA",
  },
  {
    key: "auchan",
    label: "Auchan",
    kind: "RETAIL",
    description: "Compras Auchan / Jumbo.",
    importProvider: "AUCHAN",
  },
  {
    key: "loyalty",
    label: "Programas de fidelização",
    kind: "LOYALTY",
    description: "Cartões e apps de fidelização.",
    comingSoon: true,
  },
  {
    key: "galp",
    label: "Galp",
    kind: "FUEL",
    description: "Combustível e energia Galp.",
    importProvider: "GALP",
  },
  {
    key: "repsol",
    label: "Repsol",
    kind: "FUEL",
    description: "Combustível Repsol.",
    importProvider: "REPSOL",
  },
  {
    key: "prio",
    label: "Prio",
    kind: "FUEL",
    description: "Combustível Prio.",
    importProvider: "PRIO",
  },
  {
    key: "tesla",
    label: "Tesla",
    kind: "AUTO",
    description: "Carregamentos e custos Tesla.",
    importProvider: "TESLA",
  },
  {
    key: "auto_other",
    label: "Outras marcas automóveis",
    kind: "AUTO",
    description: "Apps de outras marcas (futuro).",
    comingSoon: true,
  },
  {
    key: "water",
    label: "Água",
    kind: "UTILITY",
    description: "Faturas de água (EPAL e outras).",
    comingSoon: true,
  },
  {
    key: "electricity",
    label: "Eletricidade",
    kind: "UTILITY",
    description: "Faturas de luz (EDP, Endesa, …).",
    comingSoon: true,
  },
  {
    key: "gas",
    label: "Gás",
    kind: "UTILITY",
    description: "Faturas de gás.",
    comingSoon: true,
  },
  {
    key: "telecom",
    label: "Telecomunicações",
    kind: "TELECOM",
    description: "NOS, MEO, Vodafone e outras.",
    comingSoon: true,
  },
  {
    key: "insurance",
    label: "Seguradoras",
    kind: "INSURANCE",
    description: "Prémios e apólices.",
    comingSoon: true,
  },
  {
    key: "investments",
    label: "Plataformas de investimento",
    kind: "INVESTMENT",
    description: "Corretoras e apps de investimento.",
    comingSoon: true,
  },
  {
    key: "other",
    label: "Outros serviços",
    kind: "OTHER",
    description: "Novas integrações que venham a existir.",
    comingSoon: true,
  },
];

export const CONNECTION_KIND_LABELS: Record<ConnectionKind, string> = {
  BANKING: "Bancos",
  CARD: "Cartões",
  WALLET: "Carteiras",
  EMAIL: "Email",
  RETAIL: "Supermercados",
  LOYALTY: "Fidelização",
  FUEL: "Combustível",
  AUTO: "Automóvel",
  UTILITY: "Utilidades",
  TELECOM: "Telecomunicações",
  INSURANCE: "Seguros",
  TAX: "Fiscal",
  INVESTMENT: "Investimentos",
  OTHER: "Outros",
};

export const AUTOMATION_LEVELS: {
  id: AutomationLevel;
  label: string;
  hint: string;
}[] = [
  { id: "VOICE", label: "Apenas voz", hint: "Falas com a Nina — sem ligações externas." },
  { id: "VOICE_OCR", label: "Voz + OCR", hint: "Conversas e fotografias de faturas." },
  { id: "VOICE_EMAIL", label: "Voz + Email", hint: "Nina lê faturas no email que autorizares." },
  { id: "VOICE_BANK", label: "Voz + Banco", hint: "Open Banking quando quiseres." },
  {
    id: "VOICE_BANK_EMAIL_RETAIL",
    label: "Voz + Banco + Email + Supermercados",
    hint: "Automatização avançada, sempre sob o teu controlo.",
  },
  { id: "FULL", label: "Automatização total", hint: "Todas as ligações que ativares sincronizam sozinhas." },
];

export function catalogByKey(key: string) {
  return CONNECTION_CATALOG.find((c) => c.key === key);
}

export function groupCatalogByKind() {
  const map = new Map<ConnectionKind, ConnectionCatalogItem[]>();
  for (const item of CONNECTION_CATALOG) {
    const list = map.get(item.kind) ?? [];
    list.push(item);
    map.set(item.kind, list);
  }
  return map;
}
