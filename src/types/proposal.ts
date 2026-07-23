export type ProposalStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "expired";

export interface Proposal {
  id: string;
  tripId: string;
  driverId: string;
  vehicleId: string;
  status: ProposalStatus;
  /** Amount in cents (EUR) */
  priceCents: number;
  currency: "EUR";
  message?: string;
  estimatedPickupAt?: string;
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalWithDriver extends Proposal {
  driverName: string;
  driverRatingAverage: number;
  driverRatingCount: number;
  vehicleLabel: string;
  vehicleClass: string;
}
