import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Lightweight production diagnostics (no secrets leaked). */
export async function GET() {
  const checks = {
    ok: true as boolean,
    authSecret: Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 16),
    authTrustHost: process.env.AUTH_TRUST_HOST === "true" || Boolean(process.env.VERCEL),
    databaseUrl: Boolean(process.env.DATABASE_URL),
    directUrl: Boolean(process.env.DIRECT_URL),
    database: "unknown" as "ok" | "error" | "unknown",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
    checks.ok = false;
  }

  if (!checks.authSecret || !checks.databaseUrl || !checks.directUrl) {
    checks.ok = false;
  }

  return NextResponse.json(checks, { status: checks.ok ? 200 : 503 });
}
