import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { createOfferSchema } from "@/lib/validators";
import {
  createOrUpdateOffer,
  DomainError,
} from "@/domain/marketplace";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return apiError("UNAUTHORIZED", "Login necessário", 401);

  const tripId = new URL(request.url).searchParams.get("tripId");

  if (session.user.role === "CUSTOMER" && tripId) {
    const trip = await prisma.tripRequest.findUnique({ where: { id: tripId } });
    if (!trip || trip.customerId !== session.user.id) {
      return apiError("FORBIDDEN", "Sem permissão", 403);
    }
    const offers = await prisma.offer.findMany({
      where: { tripRequestId: tripId },
      orderBy: { priceAmount: "asc" },
      include: {
        driver: { select: { id: true, name: true, driverProfile: true } },
        vehicle: true,
      },
    });
    return Response.json({ offers });
  }

  if (session.user.role === "DRIVER") {
    const offers = await prisma.offer.findMany({
      where: { driverId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { tripRequest: true, vehicle: true },
    });
    return Response.json({ offers });
  }

  return apiError("FORBIDDEN", "Sem permissão", 403);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") {
    return apiError("UNAUTHORIZED", "Login necessário", 401);
  }

  const body = await request.json();
  const parsed = createOfferSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION", parsed.error.message);

  try {
    const offer = await createOrUpdateOffer({
      driverId: session.user.id,
      ...parsed.data,
    });
    return Response.json({ offer }, { status: 201 });
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message);
    throw error;
  }
}
