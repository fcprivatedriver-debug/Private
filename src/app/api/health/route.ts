import { NextResponse } from "next/server";
import { prisma, resolveNinaSchema } from "@/lib/db";
import { resolveAuthSecret } from "@/lib/auth-secret";

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
    pgSchema: resolveNinaSchema() || "public",
    userCount: null as number | null,
    database: "unknown" as "ok" | "error" | "unknown",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
    checks.userCount = await prisma.user.count();
  } catch {
    checks.database = "error";
    checks.ok = false;
  }

  if (!checks.databaseUrl) {
    checks.ok = false;
  }

  return NextResponse.json(checks, { status: checks.ok ? 200 : 503 });
}
