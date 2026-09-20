/**
 * OCR de faturas — Vision OpenAI (gpt-4o-mini) com schema estruturado.
 * Sem chave / falha: available=false. ZERO totais inventados.
 */

import {
  analyzeInvoiceDocument,
  type InvoiceExtraction,
} from "@/lib/ocr/analyze-invoice";

export type OcrLineItem = {
  name: string;
  quantity: number;
  unitCents: number;
  totalCents: number;
  vatRate?: number;
};

export type OcrResult = {
  available: boolean;
  unavailableReason?: string;
  storeName: string;
  date: string;
  dueDate: string | null;
  totalCents: number;
  vatCents: number;
  suggestedCategorySlug: string;
  invoiceNumber: string | null;
  currency: string | null;
  description: string | null;
  items: OcrLineItem[];
  confidence: number;
  fieldConfidence: InvoiceExtraction["confidence"] | null;
  extraction: InvoiceExtraction | null;
  rawText: string;
  model?: string;
};

export async function recognizeReceipt(input?: {
  fileName?: string;
  hintText?: string;
  /** Bytes do ficheiro — necessário para Vision. Sem bytes = indisponível. */
  bytes?: Buffer;
  mimeType?: string;
  userId?: string;
  familyId?: string;
}): Promise<OcrResult> {
  const empty: OcrResult = {
    available: false,
    unavailableReason:
      "A leitura automática de faturas ainda não está disponível. Regista a despesa manualmente ou por voz.",
    storeName: "",
    date: "",
    dueDate: null,
    totalCents: 0,
    vatCents: 0,
    suggestedCategorySlug: "outros",
    invoiceNumber: null,
    currency: null,
    description: null,
    items: [],
    confidence: 0,
    fieldConfidence: null,
    extraction: null,
    rawText: "",
  };

  if (!input?.bytes?.length) {
    return empty;
  }

  const analyzed = await analyzeInvoiceDocument({
    bytes: input.bytes,
    mimeType: input.mimeType || "image/jpeg",
    fileName: input.fileName,
    userId: input.userId,
    familyId: input.familyId,
  });

  if (!analyzed.ok) {
    return {
      ...empty,
      unavailableReason: analyzed.error,
    };
  }

  const e = analyzed.extraction;
  const totalCents =
    e.total != null && e.total > 0 ? Math.round(e.total * 100) : 0;
  const vatCents =
    e.vat != null && e.vat >= 0 ? Math.round(e.vat * 100) : 0;

  // Confiança agregada = média dos campos essenciais presentes
  const scores = [
    e.confidence.total,
    e.confidence.supplier,
    e.confidence.invoiceDate,
    e.confidence.category,
  ];
  const confidence =
    scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length);

  return {
    available: true,
    storeName: e.supplier || "",
    date: e.invoiceDate || "",
    dueDate: e.dueDate,
    totalCents,
    vatCents,
    suggestedCategorySlug: e.category || "outros",
    invoiceNumber: e.invoiceNumber,
    currency: e.currency,
    description: e.description,
    items: [],
    confidence,
    fieldConfidence: e.confidence,
    extraction: e,
    rawText: JSON.stringify(e),
    model: analyzed.model,
  };
}

export function isOcrAvailable(): boolean {
  try {
    // Dinâmico — reflecte env no runtime (Vercel Preview/Prod)
    return Boolean(process.env.OPENAI_API_KEY?.trim());
  } catch {
    return false;
  }
}
