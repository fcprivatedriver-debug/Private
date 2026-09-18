import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDriverOnboarding } from "@/domain/onboarding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Temporary diagnostics for post-register 500s. Gated by DEBUG_REGISTER=1. */
export async function GET() {
  const session = await auth();
  const out: Record<string, unknown> = {
    hasSession: Boolean(session?.user),
    userId: session?.user?.id ?? null,
    role: session?.user?.role ?? null,
    hasCustomer: session?.user?.hasCustomer ?? null,
    hasDriver: session?.user?.hasDriver ?? null,
  };

  async function probe(name: string, fn: () => Promise<unknown>) {
    try {
      const data = await fn();
      out[name] = { ok: true, data };
    } catch (error) {
      out[name] = {
        ok: false,
        name: error instanceof Error ? error.name : typeof error,
        message: error instanceof Error ? error.message.slice(0, 400) : String(error).slice(0, 400),
        code:
          error && typeof error === "object" && "code" in error
            ? String((error as { code?: unknown }).code)
            : null,
      };
    }
  }

  if (!session?.user?.id) {
    out.note = "no-session — login first then call this endpoint";
    return NextResponse.json(out);
  }

  await probe("customerTrips", () =>
    prisma.tripRequest.findMany({
      where: { customerId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { offers: true } } },
      take: 5,
    }),
  );

  await probe("driverProfile", () =>
    prisma.driverProfile.findUnique({
      where: { userId: session.user.id },
      include: { vehicles: true },
    }),
  );

  await probe("driverOnboarding", () => getDriverOnboarding(session.user.id));

  await probe("openTrips", () =>
    prisma.tripRequest.findMany({
      where: { status: "OPEN" },
      take: 3,
      include: { _count: { select: { offers: true } } },
    }),
  );

  return NextResponse.json(out);
}
