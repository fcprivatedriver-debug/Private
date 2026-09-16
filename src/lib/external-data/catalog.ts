/**
 * Registo de fontes externas — estado de conformidade e automatização.
 * Nunca inventar endpoints; só o que foi verificado.
 */

import type { ExternalDataSource } from "@prisma/client";

export type SourceAccess = "sim" | "nao" | "parcial";
export type SourceAutomation = "possivel" | "nao_possivel" | "incerta";
export type CommercialUse = "permitida" | "proibida" | "incerta" | "requer_autorizacao";

export type SourceDescriptor = {
  id: ExternalDataSource;
  label: string;
  method: string;
  access: SourceAccess;
  automation: SourceAutomation;
  commercial: CommercialUse;
  frequency: string;
  restrictions: string;
  autoSyncEnabledEnv?: string;
  /** Syncer implementado (pode estar gated por env). */
  syncerImplemented: boolean;
};

export const SOURCE_CATALOG: SourceDescriptor[] = [
  {
    id: "CONTINENTE",
    label: "Continente",
    method: "Sem API pública autorizada; robots.txt bloqueia pesquisa (*q=*). Importação manual CSV/JSON.",
    access: "nao",
    automation: "nao_possivel",
    commercial: "requer_autorizacao",
    frequency: "manual",
    restrictions: "robots.txt Disallow pesquisa; sem feed oficial de preços.",
    syncerImplemented: false,
  },
  {
    id: "PINGO_DOCE",
    label: "Pingo Doce",
    method: "Sem API pública; Demandware/SFCC bloqueado em robots. Importação manual CSV/JSON.",
    access: "nao",
    automation: "nao_possivel",
    commercial: "requer_autorizacao",
    frequency: "manual",
    restrictions: "robots.txt bloqueia Search-ShowAjax e endpoints internos SFCC.",
    syncerImplemented: false,
  },
  {
    id: "AUCHAN",
    label: "Auchan",
    method: "Sem API pública oficial encontrada. Importação manual CSV/JSON.",
    access: "nao",
    automation: "nao_possivel",
    commercial: "requer_autorizacao",
    frequency: "manual",
    restrictions: "Sem dataset/API pública de catálogo de preços.",
    syncerImplemented: false,
  },
  {
    id: "DGEG_FUEL",
    label: "Combustíveis (DGEG)",
    method:
      "API pública do portal precoscombustiveis.dgeg.gov.pt (/api/PrecoComb/PesquisarPostos). Verificado live.",
    access: "sim",
    automation: "possivel",
    commercial: "requer_autorizacao",
    frequency: "diária via cron (admin pode forçar; >1×/dia requer plano Vercel adequado)",
    restrictions:
      "Portal: «proibida a sua utilização para fins comerciais». Partilha de Informação: precoscombustiveis@dgeg.gov.pt",
    autoSyncEnabledEnv: "DGEG_FUEL_ENABLED",
    syncerImplemented: true,
  },
  {
    id: "MOBIE_LISBOA",
    label: "MOBI.E Lisboa (CM Lisboa)",
    method:
      "GeoJSON CC0 via ArcGIS POITransportes layer 2 (Postos de Carregamento Mobi E). dados.gov.pt dataset 5ae9c6b5c8d8c9146d44cc4f.",
    access: "sim",
    automation: "possivel",
    commercial: "permitida",
    frequency: "diária",
    restrictions:
      "Licença CC0. Dados estáticos (localização/tomadas); sem disponibilidade nem tarifas em tempo real.",
    autoSyncEnabledEnv: "MOBIE_LISBOA_SYNC_ENABLED",
    syncerImplemented: true,
  },
  {
    id: "MOBIE_DATEX",
    label: "MOBI.E DATEX / NAP AFIR",
    method: "NAP/DATEX ~192MB; GET completo timeout. Requer registo AFIR / stream.",
    access: "parcial",
    automation: "incerta",
    commercial: "incerta",
    frequency: "não activo",
    restrictions: "Payload demasiado grande para sync Vercel; sem credenciais NAP.",
    syncerImplemented: false,
  },
  {
    id: "MANUAL_IMPORT",
    label: "Importação manual",
    method: "CSV/JSON estruturado validado no admin técnico.",
    access: "sim",
    automation: "nao_possivel",
    commercial: "incerta",
    frequency: "sob pedido",
    restrictions: "Responsabilidade da origem dos ficheiros importados.",
    syncerImplemented: true,
  },
];

export function getSourceDescriptor(id: ExternalDataSource): SourceDescriptor | undefined {
  return SOURCE_CATALOG.find((s) => s.id === id);
}
