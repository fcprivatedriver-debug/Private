/** Categorias iniciais de despesas — mercado português */
export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Supermercado", slug: "supermercado", icon: "cart", color: "#2563eb" },
  { name: "Casa", slug: "casa", icon: "home", color: "#7c3aed" },
  { name: "Água", slug: "agua", icon: "droplet", color: "#0ea5e9" },
  { name: "Luz", slug: "luz", icon: "zap", color: "#f59e0b" },
  { name: "Gás", slug: "gas", icon: "flame", color: "#ef4444" },
  { name: "Internet", slug: "internet", icon: "wifi", color: "#6366f1" },
  { name: "Telemóveis", slug: "telemoveis", icon: "phone", color: "#8b5cf6" },
  { name: "Seguros", slug: "seguros", icon: "shield", color: "#475569" },
  { name: "Saúde", slug: "saude", icon: "heart", color: "#dc2626" },
  { name: "Farmácia", slug: "farmacia", icon: "pill", color: "#16a34a" },
  { name: "Combustível", slug: "combustivel", icon: "fuel", color: "#b45309" },
  { name: "Carregamentos Elétricos", slug: "carregamentos-eletricos", icon: "battery", color: "#059669" },
  { name: "Transportes", slug: "transportes", icon: "bus", color: "#0284c7" },
  { name: "Restaurantes", slug: "restaurantes", icon: "utensils", color: "#ea580c" },
  { name: "Lazer", slug: "lazer", icon: "gamepad", color: "#db2777" },
  { name: "Férias", slug: "ferias", icon: "plane", color: "#0891b2" },
  { name: "Roupa", slug: "roupa", icon: "shirt", color: "#9333ea" },
  { name: "Educação", slug: "educacao", icon: "book", color: "#1d4ed8" },
  { name: "Animais", slug: "animais", icon: "paw", color: "#a16207" },
  { name: "TVDE", slug: "tvde", icon: "car", color: "#0f766e" },
  { name: "Empresa", slug: "empresa", icon: "briefcase", color: "#334155" },
  { name: "Impostos", slug: "impostos", icon: "receipt", color: "#991b1b" },
  { name: "Presentes", slug: "presentes", icon: "gift", color: "#be185d" },
  { name: "Diversão", slug: "diversao", icon: "smile", color: "#c026d3" },
  { name: "Outros", slug: "outros", icon: "more", color: "#64748b" },
] as const;

/** Categorias iniciais de receitas */
export const DEFAULT_INCOME_CATEGORIES = [
  { name: "Salário", slug: "salario", icon: "wallet", color: "#0f7a4a" },
  { name: "Subsídio", slug: "subsidio", icon: "star", color: "#15803d" },
  { name: "Donativo", slug: "donativo", icon: "heart", color: "#047857" },
  { name: "Reembolso", slug: "reembolso", icon: "refresh", color: "#059669" },
  { name: "Venda", slug: "venda", icon: "tag", color: "#0f766e" },
  { name: "Renda", slug: "renda-receita", icon: "home", color: "#166534" },
  { name: "Outro", slug: "receita-outro", icon: "plus", color: "#10b981" },
] as const;

export const BUDGET_GROUPS = [
  "Supermercado",
  "Combustível",
  "Restaurantes",
  "Lazer",
  "Casa",
  "Transportes",
] as const;

export const RECURRING_PRESETS = [
  "Renda",
  "Água",
  "Luz",
  "Gás",
  "Internet",
  "Netflix",
  "Spotify",
  "Seguros",
  "Ginásio",
] as const;

export const IMPORT_PROVIDERS = [
  { id: "CONTINENTE", name: "Continente", kind: "api" },
  { id: "PINGO_DOCE", name: "Pingo Doce", kind: "api" },
  { id: "LIDL_PLUS", name: "Lidl Plus", kind: "api" },
  { id: "MERCADONA", name: "Mercadona", kind: "api" },
  { id: "AUCHAN", name: "Auchan", kind: "api" },
  { id: "REPSOL", name: "Repsol", kind: "api" },
  { id: "GALP", name: "Galp", kind: "api" },
  { id: "PRIO", name: "Prio", kind: "api" },
  { id: "VIA_VERDE", name: "Via Verde", kind: "api" },
  { id: "TESLA", name: "Tesla", kind: "api" },
  { id: "MB_WAY", name: "MB Way", kind: "api" },
  { id: "REVOLUT", name: "Revolut", kind: "api" },
  { id: "OPEN_BANKING", name: "Bancos (Open Banking)", kind: "api" },
  { id: "PDF", name: "PDF", kind: "file" },
  { id: "CSV", name: "CSV", kind: "file" },
  { id: "EMAIL", name: "Email", kind: "email" },
] as const;

export const GOAL_PRESETS = [
  { type: "CAR", name: "Comprar carro", icon: "car" },
  { type: "HOUSE", name: "Casa", icon: "home" },
  { type: "VACATION", name: "Férias", icon: "plane" },
  { type: "EMERGENCY", name: "Fundo de emergência", icon: "shield" },
  { type: "INVESTMENT", name: "Investimentos", icon: "trending" },
  { type: "RETIREMENT", name: "Reforma", icon: "sunset" },
  { type: "EDUCATION", name: "Estudos", icon: "book" },
  { type: "OTHER", name: "Outros", icon: "more" },
] as const;

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Numerário",
  DEBIT_CARD: "Cartão de débito",
  CREDIT_CARD: "Cartão de crédito",
  MB_WAY: "MB Way",
  TRANSFER: "Transferência",
  DIRECT_DEBIT: "Débito direto",
  REVOLUT: "Revolut",
  OTHER: "Outro",
};
