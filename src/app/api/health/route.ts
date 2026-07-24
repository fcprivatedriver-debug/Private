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
    dbDetail: null as string | null,
    database: "unknown" as "ok" | "error" | "unknown",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
    try {
      checks.userCount = await prisma.user.count();
    } catch (err) {
      checks.userCount = null;
      checks.dbDetail = "user_count_failed";
      console.error("[health] user.count failed", err);
    }
  } catch (err) {
    checks.database = "error";
    checks.ok = false;
    checks.dbDetail = err instanceof Error ? err.name : "query_failed";
    console.error("[health] db ping failed", err);
  }

  if (!checks.databaseUrl) {
    checks.ok = false;
  }

  return NextResponse.json(checks, { status: checks.ok ? 200 : 503 });
}
