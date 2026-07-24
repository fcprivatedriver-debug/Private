import { z } from "zod";

/** Treat empty FormData strings as undefined before coercion. */
const emptyToUndef = (v: unknown) =>
  v === "" || v === null || v === undefined ? undefined : v;

const optionalNumber = z.preprocess(
  emptyToUndef,
  z.coerce.number().optional(),
);

const optionalPositiveInt = z.preprocess(
  emptyToUndef,
  z.coerce.number().int().positive().optional(),
);

const optionalNonNegInt = z.preprocess(
  emptyToUndef,
  z.coerce.number().int().min(0).max(360).optional(),
);

export const createTripSchema = z.object({
  pickupAddress: z.string().min(3, "Indica a origem"),
  dropoffAddress: z.string().min(3, "Indica o destino"),
  pickupAt: z.string().min(1, "Indica data e hora"),
  passengers: z.coerce.number().int().min(1).max(20),
  luggage: z.coerce.number().int().min(0).max(30),
  notes: z.preprocess(emptyToUndef, z.string().optional()),
  flightNumber: z.preprocess(emptyToUndef, z.string().optional()),
  preferredVehicleClassId: z.preprocess(emptyToUndef, z.string().min(1).optional()),
  publish: z.coerce.boolean().optional(),
  pickupLat: optionalNumber,
  pickupLng: optionalNumber,
  dropoffLat: optionalNumber,
  dropoffLng: optionalNumber,
  distanceMeters: optionalPositiveInt,
  durationSeconds: optionalPositiveInt,
  plannerEnabled: z.coerce.boolean().optional(),
  plannerTripType: z.preprocess(
    emptyToUndef,
    z.enum(["AIRPORT", "MEETING", "EVENT", "HOTEL", "CUSTOM"]).optional(),
  ),
  desiredArrivalAt: z.preprocess(emptyToUndef, z.string().optional()),
  safetyBufferMinutes: optionalNonNegInt,
  flightScope: z.preprocess(
    emptyToUndef,
    z.enum(["DOMESTIC", "INTERNATIONAL"]).optional(),
  ),
});

export const createOfferSchema = z.object({
  tripRequestId: z.string().min(1),
  vehicleId: z.string().optional(),
  priceEuros: z.coerce.number().positive("Preço inválido"),
  message: z.string().max(500).optional(),
  includesTolls: z.coerce.boolean().optional(),
  includesWaiting: z.coerce.boolean().optional(),
  estimatedArrivalMinutes: z.coerce.number().int().min(1).max(240).optional(),
});

export const reviewSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  vehicleRating: z.coerce.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000).optional(),
});

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  role: z.enum(["CUSTOMER", "DRIVER"]),
});

export const vehicleSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.coerce.number().int().min(1990).max(2100),
  color: z.string().min(1),
  plate: z.string().min(2),
  seats: z.coerce.number().int().min(1).max(50),
  luggageCapacity: z.coerce.number().int().min(0).max(50),
  vehicleClassId: z.string().min(1),
});
