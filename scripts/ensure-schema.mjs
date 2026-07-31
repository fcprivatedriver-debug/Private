#!/usr/bin/env node
/**
 * Soft schema check for FC Private Driver — never fails the build.
 * Marketplace VehicleClass / TVDE repairs intentionally removed.
 */
import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  console.warn("[ensure-schema] No DATABASE_URL — skip");
  process.exit(0);
}

const prisma = new PrismaClient();

try {
  await prisma.$queryRaw`SELECT 1`;
  const plans = await prisma.plan.count().catch(() => null);
  console.log("[ensure-schema] OK", { plans });
} catch (err) {
  console.warn("[ensure-schema] WARN", err instanceof Error ? err.message : err);
} finally {
  await prisma.$disconnect().catch(() => {});
}

process.exit(0);
