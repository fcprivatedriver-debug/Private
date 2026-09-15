import type { ServiceMeta } from "../../services/types";

export type EvConnector = "ccs2" | "type2" | "chademo" | "tesla";

export type ChargingStation = {
  id: string;
  name: string;
  network: string;
  lat: number;
  lng: number;
  distanceKm: number;
  powerKw: number;
  connector: EvConnector;
  pricePerKwhCents: number;
  address: string;
  mapsUrl: string;
  cardsAccepted: string[];
};

export type EvContext = {
  lat?: number;
  lng?: number;
  batteryPercent: number;
  targetPercent?: number;
  batteryKwh?: number;
  preferredNetworks?: string[];
  preferredCards?: string[];
};

export type EvRecommendation = {
  station: ChargingStation;
  chargeMinutes: number;
  energyKwh: number;
  estimatedCostCents: number;
  etaMinutes: number;
  reason: string;
  alternatives: ChargingStation[];
};

export interface ChargingProvider {
  id: string;
  label: string;
  search(ctx: EvContext): Promise<ChargingStation[]>;
}

export interface EvService {
  meta: ServiceMeta;
  recommend(ctx: EvContext): Promise<EvRecommendation | null>;
}
