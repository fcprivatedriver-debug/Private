/**
 * Provider combustível — estado honesto.
 *
 * DGEG / Preços dos Combustíveis Online:
 * - Portal: https://precoscombustiveis.dgeg.gov.pt/
 * - Utilização comercial dos dados do portal: NÃO autorizada nos termos públicos.
 * - Acesso legítimo: pedido “Partilha de Informação” a precoscombustiveis@dgeg.gov.pt
 *
 * Até haver credencial/acordo: devolve lista vazia (Informação indisponível).
 * NÃO usa postos/preços hardcoded.
 */

import type { FuelProvider, FuelQuoteContext, FuelStation } from "../types";

export type FuelProviderStatus = {
  id: string;
  available: boolean;
  reason: string;
  licenseNote: string;
};

export const DGEG_PROVIDER_STATUS: FuelProviderStatus = {
  id: "dgeg",
  available: false,
  reason:
    "Preços de combustível indisponíveis. É necessário acordo de Partilha de Informação com a DGEG para utilização autorizada.",
  licenseNote:
    "O portal DGEG proíbe utilização comercial sem parceria. Não fazer scraping nem apresentar dados fictícios.",
};

/**
 * Quando `DGEG_FUEL_ENABLED=true` e existir integração autorizada,
 * este provider será ligado. Por agora: sempre vazio.
 */
export const dgegFuelProvider: FuelProvider = {
  id: "dgeg",
  label: "DGEG",
  async search(ctx: FuelQuoteContext): Promise<FuelStation[]> {
    void ctx;
    if (process.env.DGEG_FUEL_ENABLED === "true" && process.env.DGEG_FUEL_API_URL) {
      // Integração autorizada ainda não configurada — nunca inventar.
      console.warn("[fuel] DGEG_FUEL_ENABLED sem implementação autorizada activa");
    }
    return [];
  },
};
