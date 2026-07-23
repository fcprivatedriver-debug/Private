import { prisma } from "@/lib/db";
import { getEnv } from "@/config/env";

export type CommissionContext = {
  countryCode?: string | null;
  vehicleCategory?: string | null;
  currency?: string | null;
};

/**
 * Resolves commission percent for a booking.
 * Priority: matching CommissionRule (highest priority) → PlatformSettings → env default.
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
    if (rule.vehicleCategory && rule.vehicleCategory !== ctx.vehicleCategory) continue;
    if (rule.currency && rule.currency !== ctx.currency) continue;
    return rule.percent;
  }

  const settings = await prisma.platformSettings.findUnique({
    where: { id: "default" },
  });
  if (settings) return settings.defaultCommissionPercent;

  return getEnv().PLATFORM_FEE_PERCENT;
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
