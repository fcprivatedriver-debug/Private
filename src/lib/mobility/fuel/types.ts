import type { ServiceMeta } from "../../services/types";

export type FuelType = "petrol" | "diesel" | "lpg";

export type FuelStation = {
  id: string;
  name: string;
  brand: string | null;
  fuelType: FuelType;
  pricePerLitreCents: number;
  lat: number;
  lng: number;
  distanceKm: number;
  address: string;
  cardsAccepted: string[];
  mapsUrl: string;
};

export type FuelQuoteContext = {
  lat?: number;
  lng?: number;
  fuelType: FuelType;
  budgetEuros?: number;
  preferredBrands?: string[];
  preferredCards?: string[];
};

export type FuelRecommendation = {
  station: FuelStation;
  fillLitres: number | null;
  estimatedCostCents: number;
  reason: string;
  alternatives: FuelStation[];
};

export interface FuelProvider {
  id: string;
  label: string;
  search(ctx: FuelQuoteContext): Promise<FuelStation[]>;
}

export interface FuelService {
  meta: ServiceMeta;
  recommend(ctx: FuelQuoteContext): Promise<FuelRecommendation | null>;
}
