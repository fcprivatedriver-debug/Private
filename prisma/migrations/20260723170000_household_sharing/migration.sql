-- CreateEnum
CREATE TYPE "HouseholdKind" AS ENUM ('INDIVIDUAL', 'COUPLE', 'FAMILY', 'SHARED');

-- AlterTable
ALTER TABLE "Family" ADD COLUMN "kind" "HouseholdKind" NOT NULL DEFAULT 'FAMILY';
ALTER TABLE "Family" ADD COLUMN "inviteCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Family_inviteCode_key" ON "Family"("inviteCode");
