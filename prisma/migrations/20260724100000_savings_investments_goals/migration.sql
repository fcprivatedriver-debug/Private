-- Enums
DO $$ BEGIN
  CREATE TYPE "AccountKind" AS ENUM ('PERSONAL', 'FAMILY', 'BUSINESS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GoalPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "InvestmentVehicle" AS ENUM ('NONE', 'TERM_DEPOSIT', 'SAVINGS_CERTIFICATES', 'ETF', 'INVESTMENT_FUND', 'INTEREST_ACCOUNT', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "Capitalization" AS ENUM ('SIMPLE', 'COMPOUND');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "InterestPeriod" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'YEARLY', 'AT_MATURITY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "GoalType" ADD VALUE 'EDUCATION';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "GoalType" ADD VALUE 'OTHER';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- SavingsGoal columns
ALTER TABLE "SavingsGoal" ADD COLUMN IF NOT EXISTS "accountKind" "AccountKind" NOT NULL DEFAULT 'PERSONAL';
ALTER TABLE "SavingsGoal" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "SavingsGoal" ADD COLUMN IF NOT EXISTS "priority" "GoalPriority" NOT NULL DEFAULT 'MEDIUM';

CREATE TABLE IF NOT EXISTS "SavingPot" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "ownerMemberId" TEXT,
    "scope" "FinanceScope" NOT NULL DEFAULT 'FAMILY',
    "accountKind" "AccountKind" NOT NULL DEFAULT 'PERSONAL',
    "name" TEXT NOT NULL,
    "kind" "GoalType" NOT NULL DEFAULT 'CUSTOM',
    "currentCents" INTEGER NOT NULL DEFAULT 0,
    "targetCents" INTEGER NOT NULL,
    "deadline" TIMESTAMP(3),
    "notes" TEXT,
    "color" TEXT NOT NULL DEFAULT '#0f7a4a',
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isInvested" BOOLEAN NOT NULL DEFAULT false,
    "investmentVehicle" "InvestmentVehicle" NOT NULL DEFAULT 'NONE',
    "investedCapitalCents" INTEGER,
    "annualRatePercent" DOUBLE PRECISION,
    "capitalization" "Capitalization",
    "interestPeriod" "InterestPeriod",
    "investmentStartDate" TIMESTAMP(3),
    "linkedGoalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavingPot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GoalItem" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoalItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SavingPot_familyId_idx" ON "SavingPot"("familyId");
CREATE INDEX IF NOT EXISTS "SavingPot_familyId_scope_idx" ON "SavingPot"("familyId", "scope");
CREATE INDEX IF NOT EXISTS "SavingPot_linkedGoalId_idx" ON "SavingPot"("linkedGoalId");
CREATE INDEX IF NOT EXISTS "GoalItem_goalId_idx" ON "GoalItem"("goalId");

DO $$ BEGIN
  ALTER TABLE "SavingPot" ADD CONSTRAINT "SavingPot_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SavingPot" ADD CONSTRAINT "SavingPot_ownerMemberId_fkey" FOREIGN KEY ("ownerMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SavingPot" ADD CONSTRAINT "SavingPot_linkedGoalId_fkey" FOREIGN KEY ("linkedGoalId") REFERENCES "SavingsGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GoalItem" ADD CONSTRAINT "GoalItem_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "SavingsGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
