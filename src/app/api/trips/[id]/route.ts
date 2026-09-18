import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { acceptOffer, cancelTrip, publishTrip, DomainError } from "@/domain/marketplace";
import { canRevealContacts } from "@/lib/contacts";
import { publicFirstName } from "@/lib/location-label";

type Ctx = { params: Promise<{ id: string }> };

function canDriver(session: { user?: { role?: string; hasDriver?: boolean } | null }) {
  return (
    session.user?.role === "DRIVER" ||
    session.user?.role === "ADMIN" ||
    Boolean(session.user?.hasDriver)
  );
}

export async function GET(_request: Request, context: Ctx) {
  const session = await auth();
  if (!session?.user) return apiError("UNAUTHORIZED", "Login necessário", 401);

  const { id } = await context.params;

  // Never select email/phone into the base query — only load after reveal check.
  const trip = await prisma.tripRequest.findUnique({
    where: { id },
    include: {
      offers: {
        include: {
          driver: {
            select: {
              id: true,
              name: true,
              image: true,
              driverProfile: {
                select: {
                  id: true,
                  photoUrl: true,
                  ratingAvg: true,
                  ratingCount: true,
                  yearsOfExperience: true,
                  completedTripsCount: true,
                  languagesSpoken: true,
                  avgResponseTimeMinutes: true,
                },
              },
            },
          },
          vehicle: { include: { vehicleClass: true } },
        },
        orderBy: { priceAmount: "asc" },
      },
      booking: { include: { payment: true } },
      customer: { select: { id: true, name: true } },
      preferredVehicleClass: true,
    },
  });

  if (!trip) return apiError("NOT_FOUND", "Pedido não encontrado", 404);

  const isOwner = trip.customerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  const isDriver = canDriver(session);
  const isAssignedDriver = trip.booking?.driverId === session.user.id;

  if (!isOwner && !isAdmin && !isDriver) {
    return apiError("FORBIDDEN", "Sem permissão", 403);
  }

  if (isDriver && !isOwner && !isAdmin && trip.status !== "OPEN" && !isAssignedDriver) {
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

  let customerContact: { phone?: string | null; email?: string | null } = {};
  const driverContacts: Record<string, { phone?: string | null; email?: string | null }> = {};

  if (reveal) {
    if (isAssignedDriver || isAdmin) {
      const customer = await prisma.user.findUnique({
        where: { id: trip.customerId },
        select: { phone: true, email: true },
      });
      customerContact = { phone: customer?.phone, email: customer?.email };
    }
    if (isOwner || isAdmin) {
      const acceptedId = trip.acceptedOfferId;
      if (acceptedId) {
        const accepted = trip.offers.find((o) => o.id === acceptedId);
        if (accepted) {
          const driver = await prisma.user.findUnique({
            where: { id: accepted.driverId },
            select: { phone: true, email: true },
          });
          driverContacts[accepted.driverId] = {
            phone: driver?.phone,
            email: driver?.email,
          };
        }
      }
    }
  }

  if (isDriver && !isOwner && !isAdmin) {
    const sanitized = {
      ...trip,
      customer: {
        id: trip.customer.id,
        name: publicFirstName(trip.customer.name, "Cliente"),
        ...customerContact,
      },
      offers: trip.offers
        .filter((o) => o.driverId === session.user.id)
        .map((o) => ({
          ...o,
          driver: {
            ...o.driver,
            name: o.driver.name,
            ...driverContacts[o.driverId],
          },
        })),
    };
    return NextResponse.json({ trip: sanitized });
  }

  const forCustomer = {
    ...trip,
    customer: {
      ...trip.customer,
      ...(isOwner || isAdmin ? customerContact : {}),
    },
    offers: trip.offers.map((o) => ({
      ...o,
      driver: {
        ...o.driver,
        name: publicFirstName(o.driver.name),
        ...(o.id === trip.acceptedOfferId ? driverContacts[o.driverId] || {} : {}),
      },
    })),
  };

  return NextResponse.json({ trip: forCustomer });
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
      return NextResponse.json({ trip });
    }
    if (action === "cancel") {
      const trip = await cancelTrip(id, session.user.id, session.user.role);
      return NextResponse.json({ trip });
    }
    if (action === "accept-offer") {
      const result = await acceptOffer(id, body.offerId, session.user.id);
      return NextResponse.json(result);
    }
    return apiError("BAD_REQUEST", "Ação desconhecida");
  } catch (error) {
    if (error instanceof DomainError) {
      return apiError(error.code, error.message);
    }
    throw error;
  }
}
