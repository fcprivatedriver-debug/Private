import { z } from "zod";

export const locationSchema = z.object({
  address: z.string().trim().min(3, "Morada inválida"),
  city: z.string().trim().optional(),
  country: z.string().trim().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  placeId: z.string().optional(),
});

export const createTripSchema = z.object({
  type: z.enum(["one_way", "round_trip", "hourly"]),
  vehicleClass: z.enum([
    "economy",
    "comfort",
    "business",
    "premium",
    "van",
    "minibus",
  ]),
  pickup: locationSchema,
  dropoff: locationSchema,
  pickupAt: z.string().datetime({ message: "Data/hora de recolha inválida" }),
  returnAt: z.string().datetime().optional(),
  passengerCount: z.number().int().min(1).max(50),
  luggageCount: z.number().int().min(0).max(50).optional(),
  notes: z.string().max(1000).optional(),
});

export const createProposalSchema = z.object({
  tripId: z.string().min(1),
  vehicleId: z.string().min(1),
  priceCents: z.number().int().positive("O preço deve ser positivo"),
  message: z.string().max(1000).optional(),
  estimatedPickupAt: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type CreateProposalInput = z.infer<typeof createProposalSchema>;
