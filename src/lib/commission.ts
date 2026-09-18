import { prisma } from "@/lib/db";
import { platformCommissionPercent } from "@/config/env";
import { PLATFORM_COMMISSION_PERCENT } from "@/config/constants";

export type CommissionContext = {
  countryCode?: string | null;
  vehicleClassId?: string | null;
  currency?: string | null;
};

/**
 * Resolves commission percent for a booking.
 * Priority: matching CommissionRule (highest priority)
 *   → PlatformSettings.defaultCommissionPercent
 *   → env PLATFORM_COMMISSION_PERCENT / PLATFORM_FEE_PERCENT
 *   → PLATFORM_COMMISSION_PERCENT constant (5)
 */
export async function resolveCommissionPercent(
  ctx: CommissionContext = {},
): Promise<number> {
  const rules = await prisma.commissionRule.findMany({
    where: { active: true },
    orderBy: { priority: "desc" },
  });

  for (const rule of rules) {
    if (rule.countryCode && rule.countryCode !== ctx.countryCode) continue;
    if (rule.vehicleClassId && rule.vehicleClassId !== ctx.vehicleClassId) continue;
    if (rule.currency && rule.currency !== ctx.currency) continue;
    return rule.percent;
  }

  const settings = await prisma.platformSettings.findUnique({
    where: { id: "default" },
  });
  if (settings) return settings.defaultCommissionPercent;

  try {
    return platformCommissionPercent();
  } catch {
    return PLATFORM_COMMISSION_PERCENT;
  }
}

export async function getDefaultCurrency(): Promise<string> {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: "default" },
  });
  return settings?.defaultCurrency ?? "EUR";
}

export async function getSupportedCurrencies(): Promise<string[]> {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: "default" },
  });
  if (!settings) return ["EUR"];
  try {
    const parsed = JSON.parse(settings.supportedCurrencies);
    return Array.isArray(parsed) ? parsed.map(String) : ["EUR"];
  } catch {
    return ["EUR"];
  }
}
