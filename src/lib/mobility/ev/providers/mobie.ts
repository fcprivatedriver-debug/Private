/**
 * Provider EV — estado honesto (MOBI.E / MOBI.Data / OCPI).
 *
 * - MOBI.Data: portal interactivo, sem API pública documentada para apps.
 * - OCPI hub MOBI.E: requer registo como CEME/OPC (401 sem auth).
 * - NAP IMT: possível via registo como utilizador de dados AFIR.
 *
 * Até haver credenciais: lista vazia. Zero estações inventadas.
 */

import type { ChargingProvider, ChargingStation, EvContext } from "../types";

export type EvProviderStatus = {
  id: string;
  available: boolean;
  reason: string;
};

export const MOBIE_PROVIDER_STATUS: EvProviderStatus = {
  id: "mobie",
  available: false,
  reason:
    "Carregadores eléctricos indisponíveis. É necessário acesso autorizado à rede MOBI.E / NAP (AFIR) ou OCPI.",
};

export const mobieChargingProvider: ChargingProvider = {
  id: "mobie",
  label: "MOBI.E",
  async search(ctx: EvContext): Promise<ChargingStation[]> {
    void ctx;
    if (process.env.MOBIE_EV_ENABLED === "true" && process.env.MOBIE_API_URL) {
      console.warn("[ev] MOBIE_EV_ENABLED sem implementação autorizada activa");
    }
    return [];
  },
};

/** Placeholders futuros — nunca activos sem integração real. */
export const miioChargingProvider: ChargingProvider = {
  id: "miio",
  label: "Miio",
  async search() {
    return [];
  },
};

export const teslaChargingProvider: ChargingProvider = {
  id: "tesla",
  label: "Tesla",
  async search() {
    return [];
  },
};
