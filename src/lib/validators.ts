import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(9),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As palavras-passe não coincidem",
    path: ["confirmPassword"],
  });

export const tripBookingSchema = z.object({
  pickupAddress: z.string().min(3),
  dropoffAddress: z.string().min(3),
  date: z.string().min(1),
  time: z.string().min(1),
  passengers: z.coerce.number().int().min(1).max(8),
  luggage: z.coerce.number().int().min(0).max(10),
  tripType: z.enum(["ONE_WAY", "ROUND_TRIP"]).default("ONE_WAY"),
  needsWaiting: z.boolean().optional(),
  estimatedWaitMinutes: z.coerce.number().int().min(0).optional(),
  notes: z.string().optional(),
  passengerContact: z.string().optional(),
});

export const profileSchema = z.object({
  fullName: z.string().min(2),
  addressLine: z.string().min(3),
  postalCode: z.string().min(4),
  city: z.string().min(2),
  phone: z.string().min(9),
  taxId: z.string().optional(),
  altPhone: z.string().optional(),
  notes: z.string().optional(),
});
