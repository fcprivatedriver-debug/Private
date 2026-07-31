import { z } from "zod";

export const createTripSchema = z.object({
  pickupAddress: z.string().min(3, "Indica a origem"),
  dropoffAddress: z.string().min(3, "Indica o destino"),
  pickupAt: z.string().min(1, "Indica data e hora"),
  passengers: z.coerce.number().int().min(1).max(20),
  luggage: z.coerce.number().int().min(0).max(30),
  notes: z.string().optional(),
  flightNumber: z.string().optional(),
  preferredVehicleClassId: z.string().min(1).optional(),
  publish: z.coerce.boolean().optional(),
  pickupLat: z.coerce.number().optional(),
  pickupLng: z.coerce.number().optional(),
  dropoffLat: z.coerce.number().optional(),
  dropoffLng: z.coerce.number().optional(),
  distanceMeters: z.coerce.number().int().positive().optional(),
  durationSeconds: z.coerce.number().int().positive().optional(),
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

const phoneSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))
  .refine(
    (v) => v === undefined || /^[+0-9()\s.-]{6,20}$/.test(v),
    "O número de telefone não é válido.",
  );

export const registerSchema = z.object({
  name: z
    .string({ required_error: "Indica o nome." })
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres."),
  email: z
    .string({ required_error: "Indica o email." })
    .trim()
    .email("Email inválido."),
  password: z
    .string({ required_error: "Indica a password." })
    .min(8, "A password deve ter pelo menos 8 caracteres."),
  phone: phoneSchema,
  role: z.enum(["CUSTOMER", "DRIVER"], {
    errorMap: () => ({ message: "Tipo de conta inválido." }),
  }),
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
