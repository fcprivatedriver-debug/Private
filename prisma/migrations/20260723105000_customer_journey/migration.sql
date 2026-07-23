-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_TripRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "pickupLat" REAL,
    "pickupLng" REAL,
    "dropoffAddress" TEXT NOT NULL,
    "dropoffLat" REAL,
    "dropoffLng" REAL,
    "pickupAt" DATETIME NOT NULL,
    "passengers" INTEGER NOT NULL DEFAULT 1,
    "luggage" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "flightNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "preferredVehicleClassId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "distanceMeters" INTEGER,
    "durationSeconds" INTEGER,
    "expiresAt" DATETIME,
    "acceptedOfferId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TripRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TripRequest_preferredVehicleClassId_fkey" FOREIGN KEY ("preferredVehicleClassId") REFERENCES "VehicleClass" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TripRequest_acceptedOfferId_fkey" FOREIGN KEY ("acceptedOfferId") REFERENCES "Offer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TripRequest" ("id", "customerId", "pickupAddress", "pickupLat", "pickupLng", "dropoffAddress", "dropoffLat", "dropoffLng", "pickupAt", "passengers", "luggage", "notes", "flightNumber", "status", "preferredVehicleClassId", "currency", "expiresAt", "acceptedOfferId", "createdAt", "updatedAt")
SELECT "id", "customerId", "pickupAddress", "pickupLat", "pickupLng", "dropoffAddress", "dropoffLat", "dropoffLng", "pickupAt", "passengers", "luggage", "notes", "flightNumber", "status", "preferredVehicleClassId", "currency", "expiresAt", "acceptedOfferId", "createdAt", "updatedAt" FROM "TripRequest";
DROP TABLE "TripRequest";
ALTER TABLE "new_TripRequest" RENAME TO "TripRequest";
CREATE UNIQUE INDEX "TripRequest_acceptedOfferId_key" ON "TripRequest"("acceptedOfferId");
CREATE INDEX "TripRequest_status_pickupAt_idx" ON "TripRequest"("status", "pickupAt");
CREATE INDEX "TripRequest_customerId_idx" ON "TripRequest"("customerId");
CREATE INDEX "TripRequest_preferredVehicleClassId_idx" ON "TripRequest"("preferredVehicleClassId");

CREATE TABLE "new_Offer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripRequestId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "priceAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "message" TEXT,
    "includesTolls" BOOLEAN NOT NULL DEFAULT true,
    "includesWaiting" BOOLEAN NOT NULL DEFAULT false,
    "estimatedArrivalMinutes" INTEGER,
    "validUntil" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Offer_tripRequestId_fkey" FOREIGN KEY ("tripRequestId") REFERENCES "TripRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Offer_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Offer_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Offer" ("id", "tripRequestId", "driverId", "vehicleId", "priceAmount", "currency", "message", "includesTolls", "includesWaiting", "validUntil", "status", "createdAt", "updatedAt")
SELECT "id", "tripRequestId", "driverId", "vehicleId", "priceAmount", "currency", "message", "includesTolls", "includesWaiting", "validUntil", "status", "createdAt", "updatedAt" FROM "Offer";
DROP TABLE "Offer";
ALTER TABLE "new_Offer" RENAME TO "Offer";
CREATE INDEX "Offer_tripRequestId_status_idx" ON "Offer"("tripRequestId", "status");
CREATE INDEX "Offer_driverId_status_idx" ON "Offer"("driverId", "status");

CREATE TABLE "new_Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "vehicleRating" INTEGER,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Review" ("id", "bookingId", "fromUserId", "toUserId", "rating", "comment", "createdAt")
SELECT "id", "bookingId", "fromUserId", "toUserId", "rating", "comment", "createdAt" FROM "Review";
DROP TABLE "Review";
ALTER TABLE "new_Review" RENAME TO "Review";
CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
