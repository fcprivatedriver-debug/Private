import { NextResponse } from "next/server";
import { spawnSync } from "node:child_process";

/**
 * POST /api/demo/seed
 * Header: Authorization: Bearer <CRON_SECRET or AUTH_SECRET>
 * Seeds demo accounts (safe to re-run).
 */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const expected =
    process.env.CRON_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "fc-private-driver-demo-auth-secret-32chars";

  if (!token || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Run seed in-process via dynamic import for reliability on Vercel serverless
  try {
    const { hash } = await import("bcryptjs");
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    // Minimal ensure: if admin exists, just reset passwords; else full seed via child
    const admin = await prisma.user.findUnique({
      where: { email: "admin@fcprivatedriver.demo" },
    });

    if (!admin) {
      await prisma.$disconnect();
      const res = spawnSync("npx", ["tsx", "prisma/seed.ts"], {
        encoding: "utf8",
        env: process.env,
        cwd: process.cwd(),
      });
      return NextResponse.json({
        seeded: true,
        mode: "full",
        ok: res.status === 0,
        out: `${res.stdout || ""}${res.stderr || ""}`.slice(-2000),
      });
    }

    const passwordHash = await hash("fcpd123", 12);
    await prisma.user.updateMany({
      where: {
        email: {
          in: [
            "admin@fcprivatedriver.demo",
            "cliente@fcprivatedriver.demo",
            "motorista@fcprivatedriver.demo",
          ],
        },
      },
      data: { passwordHash, status: "ACTIVE", emailVerified: new Date() },
    });
    await prisma.$disconnect();
    return NextResponse.json({ seeded: true, mode: "password-reset", ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "seed failed" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    hint: "POST with Authorization: Bearer <CRON_SECRET> to seed demo data",
  });
}
