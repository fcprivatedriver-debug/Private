import { prisma } from "../src/lib/db";
import { acceptOffer, createOrUpdateOffer } from "../src/domain/marketplace";

async function main() {
  // reset a fresh open trip for test if needed
  const customer = await prisma.user.findUnique({ where: { email: "cliente@movio.app" } });
  const driver = await prisma.user.findUnique({
    where: { email: "motorista@movio.app" },
    include: { driverProfile: { include: { vehicles: true } } },
  });
  const driver2 = await prisma.user.findUnique({
    where: { email: "motorista2@movio.app" },
    include: { driverProfile: { include: { vehicles: true } } },
  });
  if (!customer || !driver || !driver2) throw new Error("missing users");

  const pickupAt = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
  const trip = await prisma.tripRequest.create({
    data: {
      customerId: customer.id,
      pickupAddress: "Porto Airport",
      dropoffAddress: "Ribeira, Porto",
      pickupAt,
      passengers: 2,
      luggage: 2,
      status: "OPEN",
      currency: "EUR",
      expiresAt: new Date(pickupAt.getTime() - 2 * 60 * 60 * 1000),
    },
  });

  await createOrUpdateOffer({
    driverId: driver.id,
    tripRequestId: trip.id,
    vehicleId: driver.driverProfile!.vehicles[0]!.id,
    priceEuros: 55,
  });
  const offer2 = await createOrUpdateOffer({
    driverId: driver2.id,
    tripRequestId: trip.id,
    vehicleId: driver2.driverProfile!.vehicles[0]!.id,
    priceEuros: 48,
  });

  const result = await acceptOffer(trip.id, offer2.id, customer.id);
  const offers = await prisma.offer.findMany({ where: { tripRequestId: trip.id } });
  console.log(
    JSON.stringify(
      {
        tripStatus: result.trip.status,
        bookingStatus: result.booking.status,
        offers: offers.map((o) => ({ status: o.status, price: o.priceAmount })),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
