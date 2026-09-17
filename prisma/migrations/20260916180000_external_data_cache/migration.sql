-- External data cache (fuel, EV, products) + sync log. Additive only.

CREATE TYPE "ExternalDataSource" AS ENUM (
  'DGEG_FUEL',
  'DADOS_GOV_FUEL_LOCATIONS',
  'MOBIE_LISBOA',
  'MOBIE_DATEX',
  'CONTINENTE',
  'PINGO_DOCE',
  'AUCHAN',
  'MANUAL_IMPORT'
);

CREATE TYPE "ExternalSyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

CREATE TABLE IF NOT EXISTS "ExternalDataSync" (
    "id" TEXT NOT NULL,
    "source" "ExternalDataSource" NOT NULL,
    "status" "ExternalSyncStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "recordsUpserted" INTEGER NOT NULL DEFAULT 0,
    "recordsSeen" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,
    "metaJson" TEXT,
    "triggeredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExternalDataSync_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ExternalDataSync_source_startedAt_idx" ON "ExternalDataSync"("source", "startedAt");
CREATE INDEX IF NOT EXISTS "ExternalDataSync_status_startedAt_idx" ON "ExternalDataSync"("status", "startedAt");

CREATE TABLE IF NOT EXISTS "ExtFuelStation" (
    "id" TEXT NOT NULL,
    "source" "ExternalDataSource" NOT NULL DEFAULT 'DGEG_FUEL',
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "address" TEXT,
    "locality" TEXT,
    "municipality" TEXT,
    "district" TEXT,
    "postalCode" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "stationKind" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExtFuelStation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExtFuelStation_source_externalId_key" ON "ExtFuelStation"("source", "externalId");
CREATE INDEX IF NOT EXISTS "ExtFuelStation_lat_lng_idx" ON "ExtFuelStation"("lat", "lng");
CREATE INDEX IF NOT EXISTS "ExtFuelStation_brand_idx" ON "ExtFuelStation"("brand");
CREATE INDEX IF NOT EXISTS "ExtFuelStation_fetchedAt_idx" ON "ExtFuelStation"("fetchedAt");

CREATE TABLE IF NOT EXISTS "ExtFuelPrice" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "fuelType" TEXT NOT NULL,
    "fuelLabel" TEXT NOT NULL,
    "priceMilli" INTEGER NOT NULL,
    "sourceUpdatedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExtFuelPrice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExtFuelPrice_stationId_fuelType_key" ON "ExtFuelPrice"("stationId", "fuelType");
CREATE INDEX IF NOT EXISTS "ExtFuelPrice_fuelType_priceMilli_idx" ON "ExtFuelPrice"("fuelType", "priceMilli");
CREATE INDEX IF NOT EXISTS "ExtFuelPrice_fetchedAt_idx" ON "ExtFuelPrice"("fetchedAt");

DO $$ BEGIN
  ALTER TABLE "ExtFuelPrice" ADD CONSTRAINT "ExtFuelPrice_stationId_fkey"
    FOREIGN KEY ("stationId") REFERENCES "ExtFuelStation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ExtChargingStation" (
    "id" TEXT NOT NULL,
    "source" "ExternalDataSource" NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "operator" TEXT,
    "network" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "powerKw" DOUBLE PRECISION,
    "connectorCount" INTEGER,
    "connectorTypes" TEXT,
    "availability" TEXT,
    "tariffJson" TEXT,
    "dataKind" TEXT NOT NULL DEFAULT 'static',
    "sourceUpdatedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExtChargingStation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExtChargingStation_source_externalId_key" ON "ExtChargingStation"("source", "externalId");
CREATE INDEX IF NOT EXISTS "ExtChargingStation_lat_lng_idx" ON "ExtChargingStation"("lat", "lng");
CREATE INDEX IF NOT EXISTS "ExtChargingStation_fetchedAt_idx" ON "ExtChargingStation"("fetchedAt");
CREATE INDEX IF NOT EXISTS "ExtChargingStation_availability_idx" ON "ExtChargingStation"("availability");

CREATE TABLE IF NOT EXISTS "ExtProduct" (
    "id" TEXT NOT NULL,
    "source" "ExternalDataSource" NOT NULL,
    "externalId" TEXT NOT NULL,
    "store" TEXT NOT NULL,
    "storeLocationId" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "packageLabel" TEXT,
    "quantityValue" DOUBLE PRECISION,
    "quantityUnit" TEXT,
    "categoryKey" TEXT,
    "productUrl" TEXT,
    "imageUrl" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExtProduct_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExtProduct_source_store_externalId_key" ON "ExtProduct"("source", "store", "externalId");
CREATE INDEX IF NOT EXISTS "ExtProduct_source_store_idx" ON "ExtProduct"("source", "store");
CREATE INDEX IF NOT EXISTS "ExtProduct_categoryKey_idx" ON "ExtProduct"("categoryKey");
CREATE INDEX IF NOT EXISTS "ExtProduct_name_idx" ON "ExtProduct"("name");

CREATE TABLE IF NOT EXISTS "ExtProductPrice" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "regularPriceCents" INTEGER,
    "promoPriceCents" INTEGER,
    "priceCents" INTEGER NOT NULL,
    "unitPriceCents" INTEGER,
    "unitLabel" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "available" BOOLEAN,
    "sourceUpdatedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExtProductPrice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ExtProductPrice_productId_fetchedAt_idx" ON "ExtProductPrice"("productId", "fetchedAt");
CREATE INDEX IF NOT EXISTS "ExtProductPrice_fetchedAt_idx" ON "ExtProductPrice"("fetchedAt");

DO $$ BEGIN
  ALTER TABLE "ExtProductPrice" ADD CONSTRAINT "ExtProductPrice_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "ExtProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
