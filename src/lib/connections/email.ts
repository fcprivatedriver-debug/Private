import type { ImportedExpenseDraft } from "@/lib/imports";

/**
 * Extração de faturas a partir de email autorizado (stub).
 * Em produção: OAuth Gmail/Outlook + parsers por remetente.
 */
export type EmailInvoiceExtraction = ImportedExpenseDraft & {
  company: string;
  subcategory?: string;
  sourceSubject: string;
};

const DEMO_INBOX: EmailInvoiceExtraction[] = [
  {
    amountCents: 3240,
    date: new Date().toISOString().slice(0, 10),
    description: "Fatura eletricidade",
    storeName: "EDP",
    company: "EDP",
    categorySlug: "luz",
    subcategory: "residencial",
    paymentMethod: "DIRECT_DEBIT",
    sourceSubject: "A sua fatura EDP de julho",
    notes: "Extraído do email autorizado",
  },
  {
    amountCents: 1890,
    date: new Date().toISOString().slice(0, 10),
    description: "Fatura água",
    storeName: "EPAL",
    company: "EPAL",
    categorySlug: "agua",
    paymentMethod: "DIRECT_DEBIT",
    sourceSubject: "EPAL — fatura disponível",
    notes: "Extraído do email autorizado",
  },
  {
    amountCents: 1599,
    date: new Date().toISOString().slice(0, 10),
    description: "Internet fibra",
    storeName: "NOS",
    company: "NOS",
    categorySlug: "internet",
    subcategory: "fibra",
    paymentMethod: "DIRECT_DEBIT",
    sourceSubject: "Fatura NOS",
    notes: "Extraído do email autorizado",
  },
  {
    amountCents: 4590,
    date: new Date().toISOString().slice(0, 10),
    description: "Compra online",
    storeName: "Amazon",
    company: "Amazon",
    categorySlug: "outros",
    paymentMethod: "CREDIT_CARD",
    sourceSubject: "O teu recibo da Amazon",
    notes: "Extraído do email autorizado",
  },
];

export async function extractInvoicesFromAuthorizedEmail(
  providerKey: string,
): Promise<EmailInvoiceExtraction[]> {
  // Stub: filtra ligeiramente por provider para demo
  if (providerKey === "outlook") {
    return DEMO_INBOX.filter((i) => i.categorySlug !== "outros");
  }
  return DEMO_INBOX;
}
