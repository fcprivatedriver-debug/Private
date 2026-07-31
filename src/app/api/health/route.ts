import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveAuthSecret } from "@/lib/auth-secret";
import {
  isGoogleMapsConfigured,
  getGoogleMapsApiKeySource,
  GOOGLE_MAPS_ENV_NAMES,
} from "@/lib/maps/config";

/** Lightweight production diagnostics (no secrets leaked). */
export async function GET() {
  const secret = resolveAuthSecret();
  const checks = {
    ok: true as boolean,
    authSecretConfigured: Boolean(secret && secret.length >= 16),
    authSecretSource: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET ? "env" : "demo-fallback",
    authTrustHost: true,
    databaseUrl: Boolean(process.env.DATABASE_URL),
    directUrl: Boolean(
      process.env.DIRECT_URL ||
        process.env.DATABASE_URL_UNPOOLED ||
        process.env.DATABASE_URL,
    ),
    database: "unknown" as "ok" | "error" | "unknown",
    vehicleClasses: "unknown" as "ok" | "error" | "unknown",
    vehicleClassCount: null as number | null,
    vehicleClassError: null as string | null,
    googleMapsConfigured: isGoogleMapsConfigured(),
    googleMapsKeySource: getGoogleMapsApiKeySource(),
    googleMapsAcceptedEnvNames: [...GOOGLE_MAPS_ENV_NAMES],
    prismaAdapter: "@prisma/adapter-neon",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
    checks.ok = false;
  }

  try {
    checks.vehicleClassCount = await prisma.vehicleClass.count();
    checks.vehicleClasses = "ok";
  } catch (error) {
    checks.vehicleClasses = "error";
    checks.vehicleClassError =
      error instanceof Error ? `${error.name}: ${error.message.slice(0, 180)}` : "unknown";
    checks.ok = false;
  }

  if (!checks.databaseUrl) {
    checks.ok = false;
  }

  return NextResponse.json(checks, { status: checks.ok ? 200 : 503 });
}
