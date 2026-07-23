import { auth } from "@/lib/auth";
import { apiError } from "@/lib/utils";
import {
  createVehicleClass,
  listVehicleClasses,
} from "@/domain/vehicle-class";
import { DomainError } from "@/domain/marketplace";
import { z } from "zod";

const upsertSchema = z.object({
  code: z.string().min(2).max(32),
  namePt: z.string().min(1),
  nameEn: z.string().min(1),
  descriptionPt: z.string().optional().nullable(),
  descriptionEn: z.string().optional().nullable(),
  minPassengers: z.coerce.number().int().min(1),
  maxPassengers: z.coerce.number().int().min(1),
  maxLuggage: z.coerce.number().int().min(0),
  iconKey: z.string().optional().nullable(),
  sortOrder: z.coerce.number().int().optional(),
  active: z.boolean().optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") || "pt";
  const activeOnly = searchParams.get("all") !== "true";

  // Public read of active classes; admins can request all with ?all=true
  if (!activeOnly) {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return apiError("FORBIDDEN", "Sem permissão", 403);
    }
  }

  const classes = await listVehicleClasses({
    activeOnly,
    locale,
  });
  return Response.json({ classes });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return apiError("UNAUTHORIZED", "Login necessário", 401);
  }

  try {
    const body = await request.json();
    const parsed = upsertSchema.parse(body);
    const vehicleClass = await createVehicleClass(parsed);
    return Response.json({ vehicleClass }, { status: 201 });
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message);
    if (error instanceof z.ZodError) return apiError("VALIDATION", error.message);
    throw error;
  }
}
