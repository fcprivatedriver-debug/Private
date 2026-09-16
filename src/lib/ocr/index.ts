/**
 * OCR de faturas — arquitectura preparada para Vision / Tesseract / API real.
 * Sem motor real: devolve indisponível. ZERO totais/produtos inventados.
 */

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
  totalCents: number;
  vatCents: number;
  suggestedCategorySlug: string;
  items: OcrLineItem[];
  confidence: number;
  rawText: string;
};

export async function recognizeReceipt(_input?: {
  fileName?: string;
  hintText?: string;
}): Promise<OcrResult> {
  void _input;
  return {
    available: false,
    unavailableReason:
      "A leitura automática de faturas ainda não está disponível. Regista a despesa manualmente ou por voz.",
    storeName: "",
    date: "",
    totalCents: 0,
    vatCents: 0,
    suggestedCategorySlug: "outros",
    items: [],
    confidence: 0,
    rawText: "",
  };
}
