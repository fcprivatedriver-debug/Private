import { NextResponse } from "next/server";
import { prisma, resolveNinaSchema } from "@/lib/db";
import { authSecretSource } from "@/lib/auth-secret";

/** Lightweight production diagnostics (never leaks secret values). */
export async function GET() {
  const secretSource = authSecretSource();
  const checks = {
    ok: true as boolean,
    authSecretConfigured: secretSource === "env",
    authSecretSource: secretSource,
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
    demoMode:
      process.env.DEMO_MODE === "true" ||
      process.env.NEXT_PUBLIC_DEMO_MODE === "true",
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
    emailFromConfigured: Boolean(process.env.EMAIL_FROM),
  };

  if (secretSource === "missing-production") {
    checks.ok = false;
  }

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
