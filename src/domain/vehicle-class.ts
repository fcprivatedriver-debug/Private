import { prisma } from "@/lib/db";
import type { VehicleClass } from "@prisma/client";
import { DomainError } from "@/domain/marketplace";

export type VehicleClassDTO = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  minPassengers: number;
  maxPassengers: number;
  maxLuggage: number;
  iconKey: string | null;
  sortOrder: number;
  active: boolean;
};

export function localizeVehicleClass(
  vehicleClass: VehicleClass,
  locale: string = "pt",
): VehicleClassDTO {
  const isEn = locale.toLowerCase().startsWith("en");
  return {
    id: vehicleClass.id,
    code: vehicleClass.code,
    name: isEn ? vehicleClass.nameEn : vehicleClass.namePt,
    description: isEn ? vehicleClass.descriptionEn : vehicleClass.descriptionPt,
    minPassengers: vehicleClass.minPassengers,
    maxPassengers: vehicleClass.maxPassengers,
    maxLuggage: vehicleClass.maxLuggage,
    iconKey: vehicleClass.iconKey,
    sortOrder: vehicleClass.sortOrder,
    active: vehicleClass.active,
  };
}

export async function listVehicleClasses(options?: {
  activeOnly?: boolean;
  locale?: string;
}) {
  const classes = await prisma.vehicleClass.findMany({
    where: options?.activeOnly === false ? undefined : { active: true },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });
  return classes.map((c) => localizeVehicleClass(c, options?.locale ?? "pt"));
}

export async function getVehicleClassById(id: string) {
  return prisma.vehicleClass.findUnique({ where: { id } });
}

export async function getVehicleClassByCode(code: string) {
  return prisma.vehicleClass.findUnique({ where: { code: code.toUpperCase() } });
}

export async function assertActiveVehicleClass(id: string): Promise<VehicleClass> {
  const vehicleClass = await prisma.vehicleClass.findUnique({ where: { id } });
  if (!vehicleClass || !vehicleClass.active) {
    throw new DomainError("INVALID_VEHICLE_CLASS", "Classe de veículo inválida ou inativa");
  }
  return vehicleClass;
}

export type UpsertVehicleClassInput = {
  code: string;
  namePt: string;
  nameEn: string;
  descriptionPt?: string | null;
  descriptionEn?: string | null;
  minPassengers: number;
  maxPassengers: number;
  maxLuggage: number;
  iconKey?: string | null;
  sortOrder?: number;
  active?: boolean;
};

export async function createVehicleClass(input: UpsertVehicleClassInput) {
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9_]{1,31}$/.test(code)) {
    throw new DomainError("VALIDATION", "Código inválido (use A-Z, 0-9, _)");
  }
  if (input.minPassengers < 1 || input.maxPassengers < input.minPassengers) {
    throw new DomainError("VALIDATION", "Capacidade de passageiros inválida");
  }
  if (input.maxLuggage < 0) {
    throw new DomainError("VALIDATION", "Bagagem inválida");
  }

  return prisma.vehicleClass.create({
    data: {
      code,
      namePt: input.namePt.trim(),
      nameEn: input.nameEn.trim(),
      descriptionPt: input.descriptionPt?.trim() || null,
      descriptionEn: input.descriptionEn?.trim() || null,
      minPassengers: input.minPassengers,
      maxPassengers: input.maxPassengers,
      maxLuggage: input.maxLuggage,
      iconKey: input.iconKey?.trim() || null,
      sortOrder: input.sortOrder ?? 100,
      active: input.active ?? true,
    },
  });
}

export async function updateVehicleClass(id: string, input: Partial<UpsertVehicleClassInput>) {
  const existing = await prisma.vehicleClass.findUnique({ where: { id } });
  if (!existing) throw new DomainError("NOT_FOUND", "Classe não encontrada");

  const code = input.code ? input.code.trim().toUpperCase() : undefined;
  if (code && !/^[A-Z][A-Z0-9_]{1,31}$/.test(code)) {
    throw new DomainError("VALIDATION", "Código inválido (use A-Z, 0-9, _)");
  }

  const minPassengers = input.minPassengers ?? existing.minPassengers;
  const maxPassengers = input.maxPassengers ?? existing.maxPassengers;
  if (minPassengers < 1 || maxPassengers < minPassengers) {
    throw new DomainError("VALIDATION", "Capacidade de passageiros inválida");
  }

  return prisma.vehicleClass.update({
    where: { id },
    data: {
      ...(code ? { code } : {}),
      ...(input.namePt !== undefined ? { namePt: input.namePt.trim() } : {}),
      ...(input.nameEn !== undefined ? { nameEn: input.nameEn.trim() } : {}),
      ...(input.descriptionPt !== undefined
        ? { descriptionPt: input.descriptionPt?.trim() || null }
        : {}),
      ...(input.descriptionEn !== undefined
        ? { descriptionEn: input.descriptionEn?.trim() || null }
        : {}),
      ...(input.minPassengers !== undefined ? { minPassengers: input.minPassengers } : {}),
      ...(input.maxPassengers !== undefined ? { maxPassengers: input.maxPassengers } : {}),
      ...(input.maxLuggage !== undefined ? { maxLuggage: input.maxLuggage } : {}),
      ...(input.iconKey !== undefined ? { iconKey: input.iconKey?.trim() || null } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    },
  });
}

/** Soft-deactivate instead of hard delete when vehicles reference the class. */
export async function deactivateVehicleClass(id: string) {
  const existing = await prisma.vehicleClass.findUnique({
    where: { id },
    include: { _count: { select: { vehicles: true, tripRequests: true } } },
  });
  if (!existing) throw new DomainError("NOT_FOUND", "Classe não encontrada");

  return prisma.vehicleClass.update({
    where: { id },
    data: { active: false },
  });
}
