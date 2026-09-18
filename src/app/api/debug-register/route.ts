import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Temporary diagnostic for registration on Neon HTTP.
 * Disabled unless DEBUG_REGISTER=1.
 */
export async function POST(req: Request) {
  if (process.env.DEBUG_REGISTER !== "1") {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 404 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      role?: "CUSTOMER" | "DRIVER";
    };
    const role = body.role === "DRIVER" ? "DRIVER" : "CUSTOMER";
    const stamp = Date.now();
    const email = `debug.${role.toLowerCase()}.${stamp}@tripvo.test`;
    const passwordHash = await bcrypt.hash("tripvo12345", 10);

    const user = await prisma.user.create({
      data: {
        name: `Debug ${role}`,
        email,
        passwordHash,
        phone: "+351900000000",
        role,
      },
    });

    const customerProfile = await prisma.customerProfile.create({
      data: { userId: user.id },
    });

    let driverProfile = null;
    if (role === "DRIVER") {
      driverProfile = await prisma.driverProfile.create({
        data: {
          userId: user.id,
          status: "PENDING_VERIFICATION",
          onboardingStatus: "NOT_STARTED",
          onboardingStep: "profile",
          languagesSpoken: '["pt"]',
        },
      });
    }

    return NextResponse.json({
      ok: true,
      email,
      userId: user.id,
      customerProfileId: customerProfile.id,
      driverProfileId: driverProfile?.id ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        name: error instanceof Error ? error.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        code:
          error && typeof error === "object" && "code" in error
            ? String((error as { code?: unknown }).code)
            : null,
      },
      { status: 500 },
    );
  }
}
