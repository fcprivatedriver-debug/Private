import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Health check mínimo para produção.
 * Não expõe contagens, schema, secrets nem configuração interna.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, status: "healthy" }, { status: 200 });
  } catch (err) {
    console.error("[health] db ping failed", err instanceof Error ? err.name : "query_failed");
    return NextResponse.json({ ok: false, status: "unhealthy" }, { status: 503 });
  }
}
