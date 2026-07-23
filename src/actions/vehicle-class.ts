"use server";

import { auth } from "@/lib/auth";
import {
  createVehicleClass,
  updateVehicleClass,
  deactivateVehicleClass,
  type UpsertVehicleClassInput,
} from "@/domain/vehicle-class";
import { DomainError } from "@/domain/marketplace";

function fail(error: unknown) {
  if (error instanceof DomainError) {
    return { ok: false as const, error: error.message, code: error.code };
  }
  console.error(error);
  return { ok: false as const, error: "Erro inesperado", code: "INTERNAL" };
}

function parseForm(formData: FormData): UpsertVehicleClassInput {
  return {
    code: String(formData.get("code") || ""),
    namePt: String(formData.get("namePt") || ""),
    nameEn: String(formData.get("nameEn") || ""),
    descriptionPt: String(formData.get("descriptionPt") || "") || null,
    descriptionEn: String(formData.get("descriptionEn") || "") || null,
    minPassengers: Number(formData.get("minPassengers") || 1),
    maxPassengers: Number(formData.get("maxPassengers") || 3),
    maxLuggage: Number(formData.get("maxLuggage") || 2),
    iconKey: String(formData.get("iconKey") || "") || null,
    sortOrder: Number(formData.get("sortOrder") || 100),
    active: formData.get("active") === "on" || formData.get("active") === "true",
  };
}

export async function createVehicleClassAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { ok: false as const, error: "Sem permissão" };
  }
  try {
    const vehicleClass = await createVehicleClass(parseForm(formData));
    return { ok: true as const, id: vehicleClass.id };
  } catch (error) {
    return fail(error);
  }
}

export async function updateVehicleClassAction(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { ok: false as const, error: "Sem permissão" };
  }
  try {
    await updateVehicleClass(id, parseForm(formData));
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}

export async function deactivateVehicleClassAction(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { ok: false as const, error: "Sem permissão" };
  }
  try {
    await deactivateVehicleClass(id);
    return { ok: true as const };
  } catch (error) {
    return fail(error);
  }
}
