import { prisma } from "@/lib/db";

export type MobilityPrefs = {
  fuelBrand?: string | null;
  evNetwork?: string | null;
  navigationApp?: "google_maps" | "waze" | "apple_maps" | null;
  fuelType?: "petrol" | "diesel" | "electric" | null;
  typicalBatteryPct?: number | null;
};

const CATEGORY_KEY = "__mobility_prefs__";

/**
 * Learning Engine — preferências de mobilidade (sem configuração manual).
 * Reutiliza ProductPreference com chave reservada (sem nova migração).
 */
export async function getMobilityPrefs(
  familyId: string,
  userId: string,
): Promise<MobilityPrefs> {
  const row = await prisma.productPreference.findUnique({
    where: {
      familyId_userId_categoryKey: { familyId, userId, categoryKey: CATEGORY_KEY },
    },
  });
  if (!row?.preferredName) return {};
  try {
    return JSON.parse(row.preferredName) as MobilityPrefs;
  } catch {
    return {};
  }
}

export async function saveMobilityPrefs(
  familyId: string,
  userId: string,
  patch: MobilityPrefs,
) {
  const current = await getMobilityPrefs(familyId, userId);
  const next = { ...current, ...patch };
  await prisma.productPreference.upsert({
    where: {
      familyId_userId_categoryKey: { familyId, userId, categoryKey: CATEGORY_KEY },
    },
    create: {
      familyId,
      userId,
      categoryKey: CATEGORY_KEY,
      preferredName: JSON.stringify(next),
      brand: next.fuelBrand ?? next.evNetwork ?? null,
      storeName: next.navigationApp ?? null,
    },
    update: {
      preferredName: JSON.stringify(next),
      brand: next.fuelBrand ?? next.evNetwork ?? null,
      storeName: next.navigationApp ?? null,
      useCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });
  return next;
}

/** Aprende a partir de uma decisão de mobilidade (silencioso). */
export async function learnFromMobilityDecision(
  familyId: string,
  userId: string,
  opts: {
    kind: "fuel" | "ev";
    brandOrNetwork?: string;
    batteryPct?: number;
  },
) {
  const patch: MobilityPrefs = {};
  if (opts.kind === "fuel" && opts.brandOrNetwork) {
    patch.fuelBrand = opts.brandOrNetwork;
    patch.fuelType = "petrol";
  }
  if (opts.kind === "ev") {
    patch.fuelType = "electric";
    if (opts.brandOrNetwork) patch.evNetwork = opts.brandOrNetwork;
    if (opts.batteryPct != null) patch.typicalBatteryPct = opts.batteryPct;
  }
  if (Object.keys(patch).length === 0) return;
  await saveMobilityPrefs(familyId, userId, patch);
}
