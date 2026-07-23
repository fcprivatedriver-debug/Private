/*
  Warnings:

  - You are about to drop the column `languages` on the `DriverProfile` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `DriverProfile` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "defaultCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "defaultCommissionPercent" REAL NOT NULL DEFAULT 15,
    "supportedCurrencies" TEXT NOT NULL DEFAULT '["EUR"]',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "percent" REAL NOT NULL,
    "countryCode" TEXT,
    "vehicleCategory" TEXT,
    "currency" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DriverProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "photoUrl" TEXT,
    "bio" TEXT,
    "languagesSpoken" TEXT NOT NULL DEFAULT '["pt"]',
    "yearsOfExperience" INTEGER NOT NULL DEFAULT 0,
    "ratingAvg" REAL,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "completedTripsCount" INTEGER NOT NULL DEFAULT 0,
    "responseRate" REAL,
    "avgResponseTimeMinutes" REAL,
    "documents" TEXT NOT NULL DEFAULT '[]',
    "verifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DriverProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DriverProfile" (
  "bio", "documents", "id", "ratingAvg", "ratingCount", "status", "userId", "verifiedAt",
  "languagesSpoken", "createdAt", "updatedAt"
)
SELECT
  "bio", "documents", "id", "ratingAvg", "ratingCount", "status", "userId", "verifiedAt",
  CASE
    WHEN "languages" IS NULL OR "languages" = '' THEN '["pt"]'
    ELSE '["' || REPLACE("languages", ',', '","') || '"]'
  END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "DriverProfile";
DROP TABLE "DriverProfile";
ALTER TABLE "new_DriverProfile" RENAME TO "DriverProfile";
CREATE UNIQUE INDEX "DriverProfile_userId_key" ON "DriverProfile"("userId");
CREATE INDEX "DriverProfile_status_idx" ON "DriverProfile"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CommissionRule_active_priority_idx" ON "CommissionRule"("active", "priority");
