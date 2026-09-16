import { NextResponse } from "next/server";
import { assertCronAuth } from "@/lib/external-data/admin";
import { runScheduledSyncs } from "@/lib/external-data/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Vercel Cron / scheduler — Authorization: Bearer $CRON_SECRET
 * Nunca deixar aberto sem autenticação.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!assertCronAuth(auth)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await runScheduledSyncs("cron");
  return NextResponse.json({
    ok: true,
    ranAt: new Date().toISOString(),
    results: results.map((r) => ({
      source: r.source,
      status: r.status,
      recordsUpserted: r.recordsUpserted,
      recordsSeen: r.recordsSeen,
      errorSummary: r.errorSummary,
      syncId: r.syncId,
    })),
  });
}

export async function POST(req: Request) {
  return GET(req);
}
