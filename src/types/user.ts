export type UserRole = "client" | "driver" | "admin";

export type UserStatus = "active" | "inactive" | "pending" | "suspended";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ClientProfile extends User {
  role: "client";
  preferredLanguage?: string;
  defaultPickupNotes?: string;
  totalTrips: number;
}

export interface DriverProfile extends User {
  role: "driver";
  licenseNumber: string;
  licenseExpiresAt?: string;
  bio?: string;
  ratingAverage: number;
  ratingCount: number;
  isAvailable: boolean;
  verifiedAt?: string;
  totalCompletedTrips: number;
}

export interface AdminProfile extends User {
  role: "admin";
  permissions: string[];
}

export type AppUser = ClientProfile | DriverProfile | AdminProfile;
