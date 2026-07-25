import { prisma } from "../src/lib/db";
import { acceptOffer, confirmBookingPayment } from "../src/domain/marketplace";

async function main() {
  const customer = await prisma.user.findUnique({ where: { email: "cliente@movio.app" } });
  const driver = await prisma.user.findUnique({ where: { email: "motorista@movio.app" } });
  if (!customer || !driver) throw new Error("demo users missing");

  const trip = await prisma.tripRequest.findFirst({
    where: { customerId: customer.id, status: "OPEN", notes: { contains: "E2E smoke booking 2" } },
    orderBy: { createdAt: "desc" },
  });
  if (!trip) throw new Error("trip missing");

  const offer = await prisma.offer.findFirst({
    where: { tripRequestId: trip.id, driverId: driver.id },
  });
  if (!offer) throw new Error("offer missing");

  console.log("trip", trip.id, "offer", offer.id, offer.priceAmount);
  const accepted = await acceptOffer(trip.id, offer.id, customer.id);
  console.log("accepted", accepted.booking.id, accepted.paymentResult);
  const paid = await confirmBookingPayment(accepted.booking.id, customer.id);
  console.log("paid booking status", paid.status);

  const refreshed = await prisma.tripRequest.findUnique({
    where: { id: trip.id },
    include: { booking: { include: { payment: true } } },
  });
  console.log("final", {
    trip: refreshed?.status,
    booking: refreshed?.booking?.status,
    payment: refreshed?.booking?.payment?.status,
    provider: refreshed?.booking?.payment?.provider,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
