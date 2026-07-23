export type CommissionStatus = "pending" | "calculated" | "collected" | "waived";

export interface CommissionRule {
  id: string;
  name: string;
  /** Percentage in basis points (e.g. 1500 = 15%) */
  rateBps: number;
  vehicleClass?: string;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface Commission {
  id: string;
  tripId: string;
  proposalId: string;
  driverId: string;
  status: CommissionStatus;
  grossAmountCents: number;
  commissionAmountCents: number;
  netAmountCents: number;
  rateBps: number;
  currency: "EUR";
  createdAt: string;
  collectedAt?: string;
}
