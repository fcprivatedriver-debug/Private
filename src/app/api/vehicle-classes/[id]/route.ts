import { auth } from "@/lib/auth";
import { apiError } from "@/lib/utils";
import {
  deactivateVehicleClass,
  updateVehicleClass,
} from "@/domain/vehicle-class";
import { DomainError } from "@/domain/marketplace";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  code: z.string().min(2).max(32).optional(),
  namePt: z.string().min(1).optional(),
  nameEn: z.string().min(1).optional(),
  descriptionPt: z.string().optional().nullable(),
  descriptionEn: z.string().optional().nullable(),
  minPassengers: z.coerce.number().int().min(1).optional(),
  maxPassengers: z.coerce.number().int().min(1).optional(),
  maxLuggage: z.coerce.number().int().min(0).optional(),
  iconKey: z.string().optional().nullable(),
  sortOrder: z.coerce.number().int().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, context: Ctx) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return apiError("UNAUTHORIZED", "Login necessário", 401);
  }

  const { id } = await context.params;
  try {
    const body = await request.json();
    const parsed = patchSchema.parse(body);
    const vehicleClass = await updateVehicleClass(id, parsed);
    return Response.json({ vehicleClass });
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message);
    if (error instanceof z.ZodError) return apiError("VALIDATION", error.message);
    throw error;
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return apiError("UNAUTHORIZED", "Login necessário", 401);
  }

  const { id } = await context.params;
  try {
    const vehicleClass = await deactivateVehicleClass(id);
    return Response.json({ vehicleClass });
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message);
    throw error;
  }
}
