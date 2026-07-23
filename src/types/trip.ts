export type TripStatus =
  | "draft"
  | "open"
  | "awaiting_selection"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "expired";

export type TripType = "one_way" | "round_trip" | "hourly";

export type VehicleClass =
  | "economy"
  | "comfort"
  | "business"
  | "premium"
  | "van"
  | "minibus";

export interface TripLocation {
  address: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
}

export interface Trip {
  id: string;
  clientId: string;
  status: TripStatus;
  type: TripType;
  vehicleClass: VehicleClass;
  pickup: TripLocation;
  dropoff: TripLocation;
  pickupAt: string;
  returnAt?: string;
  passengerCount: number;
  luggageCount?: number;
  notes?: string;
  selectedProposalId?: string;
  assignedDriverId?: string;
  estimatedDistanceKm?: number;
  estimatedDurationMin?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

export interface TripSummary {
  id: string;
  status: TripStatus;
  pickupLabel: string;
  dropoffLabel: string;
  pickupAt: string;
  vehicleClass: VehicleClass;
  proposalCount: number;
}
