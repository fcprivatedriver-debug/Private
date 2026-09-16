/**
 * OCR de faturas — arquitectura preparada para Vision / Tesseract / API real.
 *
 * IMPORTANTE: o motor fictício anterior (totalCents: 2487) foi DESACTIVADO.
 * Até haver um motor real configurado, recognizeReceipt devolve unavailable
 * e NÃO devem ser gravadas despesas a partir destes dados.
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
  date: string;
  totalCents: number;
  vatCents: number;
  suggestedCategorySlug: string;
  items: OcrLineItem[];
  confidence: number;
  rawText: string;
  /** false até existir motor real */
  available: boolean;
  unavailableReason?: string;
};

export async function recognizeReceipt(input: {
  fileName?: string;
  hintText?: string;
}): Promise<OcrResult> {
  void input;
  return {
    storeName: "",
    date: new Date().toISOString().slice(0, 10),
    totalCents: 0,
    vatCents: 0,
    suggestedCategorySlug: "outros",
    confidence: 0,
    rawText: "",
    items: [],
    available: false,
    unavailableReason:
      "A leitura automática de faturas ainda não está disponível. Regista a despesa manualmente ou por voz.",
  };
}

export function isOcrAvailable(): boolean {
  return false;
}
