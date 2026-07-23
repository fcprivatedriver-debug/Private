/**
 * One-shot: upsert Comfort/Premium/Van, remap legacy FKs, deactivate Bus/Minibus/old codes.
 * Does NOT wipe users or trips.
 *
 * Usage: npx tsx scripts/migrate-vehicle-classes.ts
 */
import { PrismaClient } from "@prisma/client";
import { RETIRED_VEHICLE_CLASS_CODES, VEHICLE_CLASSES } from "../prisma/demo-catalog";

const prisma = new PrismaClient();

const CLASS_REMAP: Record<string, string> = {
  vc_sedan: "vc_comfort",
  vc_executive: "vc_premium",
  vc_luxury: "vc_premium",
  vc_minibus: "vc_van",
};

async function ensureClass(vc: (typeof VEHICLE_CLASSES)[number]) {
  const byId = await prisma.vehicleClass.findUnique({ where: { id: vc.id } });
  if (byId) {
    await prisma.vehicleClass.update({
      where: { id: vc.id },
      data: {
        code: vc.code,
        namePt: vc.namePt,
        nameEn: vc.nameEn,
        descriptionPt: vc.descriptionPt,
        descriptionEn: vc.descriptionEn,
        minPassengers: vc.minPassengers,
        maxPassengers: vc.maxPassengers,
        maxLuggage: vc.maxLuggage,
        iconKey: vc.iconKey,
        sortOrder: vc.sortOrder,
        active: true,
      },
    });
    return;
  }

  const byCode = await prisma.vehicleClass.findUnique({ where: { code: vc.code } });
  if (byCode) {
    // Remap FKs from accidental id → canonical id, then swap
    await prisma.vehicleClass.create({ data: { ...vc, active: true } });
    await prisma.vehicle.updateMany({
      where: { vehicleClassId: byCode.id },
      data: { vehicleClassId: vc.id },
    });
    await prisma.tripRequest.updateMany({
      where: { preferredVehicleClassId: byCode.id },
      data: { preferredVehicleClassId: vc.id },
    });
    await prisma.commissionRule.updateMany({
      where: { vehicleClassId: byCode.id },
      data: { vehicleClassId: vc.id },
    });
    await prisma.vehicleClass.update({
      where: { id: byCode.id },
      data: { active: false, code: `${byCode.code}_LEGACY` },
    });
    return;
  }

  await prisma.vehicleClass.create({ data: { ...vc, active: true } });
}

async function main() {
  for (const vc of VEHICLE_CLASSES) {
    await ensureClass(vc);
    console.log(`ensured ${vc.code} (${vc.id})`);
  }

  for (const [from, to] of Object.entries(CLASS_REMAP)) {
    const target = await prisma.vehicleClass.findUnique({ where: { id: to } });
    if (!target) {
      console.warn(`skip remap ${from} → ${to}: target missing`);
      continue;
    }
    const v = await prisma.vehicle.updateMany({
      where: { vehicleClassId: from },
      data: { vehicleClassId: to },
    });
    const t = await prisma.tripRequest.updateMany({
      where: { preferredVehicleClassId: from },
      data: { preferredVehicleClassId: to },
    });
    const c = await prisma.commissionRule.updateMany({
      where: { vehicleClassId: from },
      data: { vehicleClassId: to },
    });
    console.log(`remap ${from} → ${to}: vehicles=${v.count} trips=${t.count} rules=${c.count}`);
  }

  for (const code of RETIRED_VEHICLE_CLASS_CODES) {
    const r = await prisma.vehicleClass.updateMany({
      where: { code },
      data: { active: false },
    });
    console.log(`deactivate ${code}: ${r.count}`);
  }

  const all = await prisma.vehicleClass.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, code: true, nameEn: true, maxPassengers: true, active: true },
  });
  console.log("classes:", all);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
