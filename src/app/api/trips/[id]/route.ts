import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { acceptOffer, cancelTrip, publishTrip, DomainError } from "@/domain/marketplace";
import { canRevealContacts, sanitizeUserContacts } from "@/lib/contacts";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const session = await auth();
  if (!session?.user) return apiError("UNAUTHORIZED", "Login necessário", 401);

  const { id } = await context.params;
  const trip = await prisma.tripRequest.findUnique({
    where: { id },
    include: {
      offers: {
        include: {
          driver: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              driverProfile: true,
            },
          },
          vehicle: { include: { vehicleClass: true } },
        },
        orderBy: { priceAmount: "asc" },
      },
      booking: { include: { payment: true } },
      customer: { select: { id: true, name: true, phone: true, email: true } },
      preferredVehicleClass: true,
    },
  });

  if (!trip) return apiError("NOT_FOUND", "Pedido não encontrado", 404);

  const isOwner = trip.customerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  const isDriver = session.user.role === "DRIVER";

  if (!isOwner && !isAdmin && !isDriver) {
    return apiError("FORBIDDEN", "Sem permissão", 403);
  }

  const reveal =
    trip.booking != null &&
    canRevealContacts({
      viewerId: session.user.id,
      customerId: trip.customerId,
      driverId: trip.booking.driverId,
      bookingStatus: trip.booking.status,
      paymentStatus: trip.booking.payment?.status,
      isAdmin,
    });

  if (isDriver && !isAdmin) {
    const sanitized = {
      ...trip,
      customer: sanitizeUserContacts(trip.customer, reveal && trip.booking?.driverId === session.user.id),
      offers: trip.offers
        .filter((o) => o.driverId === session.user.id)
        .map((o) => ({
          ...o,
          driver: sanitizeUserContacts(o.driver, reveal),
        })),
    };
    return Response.json({ trip: sanitized });
  }

  const forCustomer = {
    ...trip,
    offers: trip.offers.map((o) => ({
      ...o,
      driver: sanitizeUserContacts(o.driver, reveal && o.id === trip.acceptedOfferId),
    })),
  };

  return Response.json({ trip: forCustomer });
}

export async function POST(request: Request, context: Ctx) {
  const session = await auth();
  if (!session?.user) return apiError("UNAUTHORIZED", "Login necessário", 401);

  const { id } = await context.params;
  const body = await request.json();
  const action = body.action as string;

  try {
    if (action === "publish") {
      const trip = await publishTrip(id, session.user.id);
      return Response.json({ trip });
    }
    if (action === "cancel") {
      const trip = await cancelTrip(id, session.user.id, session.user.role);
      return Response.json({ trip });
    }
    if (action === "accept-offer") {
      const result = await acceptOffer(id, body.offerId, session.user.id);
      return Response.json(result);
    }
    return apiError("BAD_REQUEST", "Ação desconhecida");
  } catch (error) {
    if (error instanceof DomainError) {
      return apiError(error.code, error.message);
    }
    throw error;
  }
}
