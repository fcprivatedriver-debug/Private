-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "DiamondProposalStatus" AS ENUM ('RECEIVED', 'UNDER_REVIEW', 'CONTACTED', 'PROPOSAL_SENT', 'ACCEPTED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- AlterTable Plan
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "tier" TEXT NOT NULL DEFAULT 'custom';
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "showPrice" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "isPersonalized" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "ctaLabelPt" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "ctaLabelEn" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "accentColor" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "specialConditions" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "internalNotes" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "DiamondProposal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "estimatedUsers" INTEGER,
    "tripsPerWeek" INTEGER,
    "usualHours" TEXT,
    "serviceZone" TEXT,
    "notes" TEXT,
    "status" "DiamondProposalStatus" NOT NULL DEFAULT 'RECEIVED',
    "adminNotes" TEXT,
    "convertedPlanId" TEXT,
    "convertedSubscriptionId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "contactedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiamondProposal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DiamondProposal_status_createdAt_idx" ON "DiamondProposal"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "DiamondProposal_email_idx" ON "DiamondProposal"("email");
CREATE INDEX IF NOT EXISTS "Plan_tier_idx" ON "Plan"("tier");

DO $$ BEGIN
  ALTER TABLE "DiamondProposal" ADD CONSTRAINT "DiamondProposal_convertedPlanId_fkey" FOREIGN KEY ("convertedPlanId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
