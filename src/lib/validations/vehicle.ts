import { z } from "zod";

export const vehicleSchema = z.object({
  make: z.string().trim().min(1, "Marca obrigatória"),
  model: z.string().trim().min(1, "Modelo obrigatório"),
  year: z.number().int().min(1990).max(new Date().getFullYear() + 1),
  color: z.string().trim().min(1, "Cor obrigatória"),
  plateNumber: z.string().trim().min(4, "Matrícula inválida"),
  vehicleClass: z.enum([
    "economy",
    "comfort",
    "business",
    "premium",
    "van",
    "minibus",
  ]),
  seats: z.number().int().min(1).max(50),
  luggageCapacity: z.number().int().min(0).max(50),
  features: z.array(z.string()).default([]),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;
