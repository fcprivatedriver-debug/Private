import { auth } from "@/lib/auth";
import { apiError } from "@/lib/utils";
import {
  createVehicleClass,
  listVehicleClasses,
} from "@/domain/vehicle-class";
import { DomainError } from "@/domain/marketplace";
import { repairVehicleClassSchema } from "@/lib/db-repair";
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
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get("locale") || "pt";
    const activeOnly = searchParams.get("all") !== "true";

    if (!activeOnly) {
      const session = await auth();
      if (!session?.user || session.user.role !== "ADMIN") {
        return apiError("FORBIDDEN", "Sem permissão", 403);
      }
    }

    let classes = await listVehicleClasses({
      activeOnly,
      locale,
    });

    if (classes.length === 0) {
      const repair = await repairVehicleClassSchema();
      if (repair.status !== "failed") {
        classes = await listVehicleClasses({ activeOnly, locale });
      }
    }

    return Response.json({ classes });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/does not exist|P2021/i.test(message)) {
      try {
        const repair = await repairVehicleClassSchema();
        if (repair.status === "repaired" || repair.status === "ok") {
          const classes = await listVehicleClasses({
            activeOnly: true,
            locale: new URL(request.url).searchParams.get("locale") || "pt",
          });
          return Response.json({ classes });
        }
      } catch (repairError) {
        console.error("[vehicle-classes] schema repair failed", repairError);
      }
    }
    console.error("[vehicle-classes] GET failed", error);
    return apiError(
      "INTERNAL",
      "Não foi possível carregar as classes de veículo.",
      500,
    );
  }
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
    console.error("[vehicle-classes] POST failed", error);
    return apiError("INTERNAL", "Não foi possível criar a classe de veículo.", 500);
  }
}
