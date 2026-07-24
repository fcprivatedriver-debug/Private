-- AlterTable
ALTER TABLE "TripRequest" ADD COLUMN "plannerEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TripRequest" ADD COLUMN "plannerTripType" TEXT;
ALTER TABLE "TripRequest" ADD COLUMN "desiredArrivalAt" TIMESTAMP(3);
ALTER TABLE "TripRequest" ADD COLUMN "safetyBufferMinutes" INTEGER;
ALTER TABLE "TripRequest" ADD COLUMN "flightScope" TEXT;
