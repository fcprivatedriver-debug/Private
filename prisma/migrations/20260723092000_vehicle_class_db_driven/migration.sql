-- CreateTable VehicleClass
CREATE TABLE "VehicleClass" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "namePt" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "descriptionPt" TEXT,
    "descriptionEn" TEXT,
    "minPassengers" INTEGER NOT NULL DEFAULT 1,
    "maxPassengers" INTEGER NOT NULL,
    "maxLuggage" INTEGER NOT NULL DEFAULT 2,
    "iconKey" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "VehicleClass_code_key" ON "VehicleClass"("code");
CREATE INDEX "VehicleClass_active_sortOrder_idx" ON "VehicleClass"("active", "sortOrder");

-- Seed canonical classes (stable IDs for migration mapping)
INSERT INTO "VehicleClass" ("id", "code", "namePt", "nameEn", "descriptionPt", "descriptionEn", "minPassengers", "maxPassengers", "maxLuggage", "iconKey", "sortOrder", "active", "createdAt", "updatedAt") VALUES
('vc_sedan', 'SEDAN', 'Sedan', 'Sedan', 'Carro standard até 3 passageiros', 'Standard car up to 3 passengers', 1, 3, 2, 'sedan', 10, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('vc_executive', 'EXECUTIVE', 'Executivo', 'Executive', 'Berlina executiva confortável', 'Comfortable executive saloon', 1, 3, 3, 'executive', 20, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('vc_van', 'VAN', 'Van', 'Van', 'Van para grupos e bagagem extra', 'Van for groups and extra luggage', 1, 7, 7, 'van', 30, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('vc_minibus', 'MINIBUS', 'Minibus', 'Minibus', 'Minibus para grupos maiores', 'Minibus for larger groups', 1, 16, 16, 'minibus', 40, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('vc_luxury', 'LUXURY', 'Luxo', 'Luxury', 'Veículo de luxo premium', 'Premium luxury vehicle', 1, 3, 3, 'luxury', 50, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Rebuild Vehicle with vehicleClassId
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "driverId" TEXT NOT NULL,
    "vehicleClassId" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "luggageCapacity" INTEGER NOT NULL DEFAULT 2,
    "photoUrls" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vehicle_vehicleClassId_fkey" FOREIGN KEY ("vehicleClassId") REFERENCES "VehicleClass" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Vehicle" (
  "id", "driverId", "vehicleClassId", "make", "model", "year", "color", "plate",
  "seats", "luggageCapacity", "photoUrls", "createdAt", "updatedAt"
)
SELECT
  "id",
  "driverId",
  CASE "category"
    WHEN 'SEDAN' THEN 'vc_sedan'
    WHEN 'EXECUTIVE' THEN 'vc_executive'
    WHEN 'VAN' THEN 'vc_van'
    WHEN 'MINIBUS' THEN 'vc_minibus'
    WHEN 'LUXURY' THEN 'vc_luxury'
    ELSE 'vc_sedan'
  END,
  "make", "model", "year", "color", "plate",
  "seats", "luggageCapacity", "photoUrls", "createdAt", "updatedAt"
FROM "Vehicle";

DROP TABLE "Vehicle";
ALTER TABLE "new_Vehicle" RENAME TO "Vehicle";
CREATE INDEX "Vehicle_driverId_idx" ON "Vehicle"("driverId");
CREATE INDEX "Vehicle_vehicleClassId_idx" ON "Vehicle"("vehicleClassId");

-- Rebuild TripRequest with preferredVehicleClassId
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
    "expiresAt" DATETIME,
    "acceptedOfferId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TripRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TripRequest_preferredVehicleClassId_fkey" FOREIGN KEY ("preferredVehicleClassId") REFERENCES "VehicleClass" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TripRequest_acceptedOfferId_fkey" FOREIGN KEY ("acceptedOfferId") REFERENCES "Offer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_TripRequest" (
  "id", "customerId", "pickupAddress", "pickupLat", "pickupLng", "dropoffAddress", "dropoffLat", "dropoffLng",
  "pickupAt", "passengers", "luggage", "notes", "flightNumber", "status", "preferredVehicleClassId",
  "currency", "expiresAt", "acceptedOfferId", "createdAt", "updatedAt"
)
SELECT
  "id", "customerId", "pickupAddress", "pickupLat", "pickupLng", "dropoffAddress", "dropoffLat", "dropoffLng",
  "pickupAt", "passengers", "luggage", "notes", "flightNumber", "status",
  CASE "preferredVehicleCategory"
    WHEN 'SEDAN' THEN 'vc_sedan'
    WHEN 'EXECUTIVE' THEN 'vc_executive'
    WHEN 'VAN' THEN 'vc_van'
    WHEN 'MINIBUS' THEN 'vc_minibus'
    WHEN 'LUXURY' THEN 'vc_luxury'
    ELSE NULL
  END,
  "currency", "expiresAt", "acceptedOfferId", "createdAt", "updatedAt"
FROM "TripRequest";

DROP TABLE "TripRequest";
ALTER TABLE "new_TripRequest" RENAME TO "TripRequest";
CREATE UNIQUE INDEX "TripRequest_acceptedOfferId_key" ON "TripRequest"("acceptedOfferId");
CREATE INDEX "TripRequest_status_pickupAt_idx" ON "TripRequest"("status", "pickupAt");
CREATE INDEX "TripRequest_customerId_idx" ON "TripRequest"("customerId");
CREATE INDEX "TripRequest_preferredVehicleClassId_idx" ON "TripRequest"("preferredVehicleClassId");

-- Rebuild CommissionRule: vehicleCategory string -> vehicleClassId
CREATE TABLE "new_CommissionRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "percent" REAL NOT NULL,
    "countryCode" TEXT,
    "vehicleClassId" TEXT,
    "currency" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommissionRule_vehicleClassId_fkey" FOREIGN KEY ("vehicleClassId") REFERENCES "VehicleClass" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_CommissionRule" (
  "id", "name", "percent", "countryCode", "vehicleClassId", "currency", "active", "priority", "createdAt", "updatedAt"
)
SELECT
  "id", "name", "percent", "countryCode",
  CASE "vehicleCategory"
    WHEN 'SEDAN' THEN 'vc_sedan'
    WHEN 'EXECUTIVE' THEN 'vc_executive'
    WHEN 'VAN' THEN 'vc_van'
    WHEN 'MINIBUS' THEN 'vc_minibus'
    WHEN 'LUXURY' THEN 'vc_luxury'
    ELSE NULL
  END,
  "currency", "active", "priority", "createdAt", "updatedAt"
FROM "CommissionRule";

DROP TABLE "CommissionRule";
ALTER TABLE "new_CommissionRule" RENAME TO "CommissionRule";
CREATE INDEX "CommissionRule_active_priority_idx" ON "CommissionRule"("active", "priority");
CREATE INDEX "CommissionRule_vehicleClassId_idx" ON "CommissionRule"("vehicleClassId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
