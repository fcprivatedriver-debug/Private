import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { createTripSchema } from "@/lib/validators";
import { createTripRequest } from "@/domain/marketplace";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return apiError("UNAUTHORIZED", "Login necessário", 401);

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");

  if (session.user.role === "CUSTOMER") {
    const trips = await prisma.tripRequest.findMany({
      where: { customerId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { offers: true } } },
    });
    return Response.json({ trips });
  }

  if (session.user.role === "DRIVER" && scope === "open") {
    const trips = await prisma.tripRequest.findMany({
      where: { status: "OPEN" },
      orderBy: { pickupAt: "asc" },
      include: {
        _count: { select: { offers: true } },
        customer: { select: { name: true } },
      },
    });
    return Response.json({ trips });
  }

  if (session.user.role === "ADMIN") {
    const trips = await prisma.tripRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return Response.json({ trips });
  }

  return apiError("FORBIDDEN", "Sem permissão", 403);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMER") {
    return apiError("UNAUTHORIZED", "Login necessário", 401);
  }

  const body = await request.json();
  const parsed = createTripSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION", parsed.error.message);
  }

  const trip = await createTripRequest({
    customerId: session.user.id,
    pickupAddress: parsed.data.pickupAddress,
    dropoffAddress: parsed.data.dropoffAddress,
    pickupAt: new Date(parsed.data.pickupAt),
    passengers: parsed.data.passengers,
    luggage: parsed.data.luggage,
    notes: parsed.data.notes,
    flightNumber: parsed.data.flightNumber,
    preferredVehicleClassId: parsed.data.preferredVehicleClassId,
    publish: parsed.data.publish,
  });

  return Response.json({ trip }, { status: 201 });
}
