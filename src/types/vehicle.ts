import type { VehicleClass } from "./trip";

export type VehicleStatus = "active" | "inactive" | "pending_review" | "rejected";

export interface Vehicle {
  id: string;
  driverId: string;
  make: string;
  model: string;
  year: number;
  color: string;
  plateNumber: string;
  vehicleClass: VehicleClass;
  seats: number;
  luggageCapacity: number;
  status: VehicleStatus;
  imageUrls: string[];
  features: string[];
  createdAt: string;
  updatedAt: string;
}
