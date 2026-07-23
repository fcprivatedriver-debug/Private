-- AlterTable
ALTER TABLE "PlatformSettings" ADD COLUMN "demoMode" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "ratingAvg" REAL;
ALTER TABLE "Vehicle" ADD COLUMN "ratingCount" INTEGER NOT NULL DEFAULT 0;
