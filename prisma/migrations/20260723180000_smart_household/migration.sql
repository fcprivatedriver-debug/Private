CREATE TYPE "FinanceScope" AS ENUM ('PERSONAL', 'FAMILY');

ALTER TABLE "Income" ADD COLUMN "scope" "FinanceScope" NOT NULL DEFAULT 'PERSONAL';
ALTER TABLE "Expense" ADD COLUMN "scope" "FinanceScope" NOT NULL DEFAULT 'PERSONAL';
ALTER TABLE "SavingsGoal" ADD COLUMN "ownerMemberId" TEXT;
ALTER TABLE "SavingsGoal" ADD COLUMN "scope" "FinanceScope" NOT NULL DEFAULT 'FAMILY';

CREATE TABLE "FamilyInvite" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "label" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FamilyInvite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NinaMemoryRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyId" TEXT,
    "triggerPhrase" TEXT NOT NULL,
    "scope" "FinanceScope",
    "categorySlug" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NinaMemoryRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NinaHabitStat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "keyType" TEXT NOT NULL,
    "keyValue" TEXT NOT NULL,
    "personalCount" INTEGER NOT NULL DEFAULT 0,
    "familyCount" INTEGER NOT NULL DEFAULT 0,
    "lastScope" "FinanceScope",
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NinaHabitStat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FamilyInvite_token_key" ON "FamilyInvite"("token");
CREATE INDEX "FamilyInvite_familyId_idx" ON "FamilyInvite"("familyId");
CREATE INDEX "FamilyInvite_token_idx" ON "FamilyInvite"("token");
CREATE INDEX "NinaMemoryRule_userId_isActive_idx" ON "NinaMemoryRule"("userId", "isActive");
CREATE UNIQUE INDEX "NinaHabitStat_userId_familyId_keyType_keyValue_key" ON "NinaHabitStat"("userId", "familyId", "keyType", "keyValue");
CREATE INDEX "NinaHabitStat_userId_familyId_idx" ON "NinaHabitStat"("userId", "familyId");
CREATE INDEX "Income_familyId_scope_idx" ON "Income"("familyId", "scope");
CREATE INDEX "Expense_familyId_scope_idx" ON "Expense"("familyId", "scope");
CREATE INDEX "SavingsGoal_familyId_scope_idx" ON "SavingsGoal"("familyId", "scope");

ALTER TABLE "FamilyInvite" ADD CONSTRAINT "FamilyInvite_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyInvite" ADD CONSTRAINT "FamilyInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NinaMemoryRule" ADD CONSTRAINT "NinaMemoryRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NinaMemoryRule" ADD CONSTRAINT "NinaMemoryRule_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NinaHabitStat" ADD CONSTRAINT "NinaHabitStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NinaHabitStat" ADD CONSTRAINT "NinaHabitStat_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavingsGoal" ADD CONSTRAINT "SavingsGoal_ownerMemberId_fkey" FOREIGN KEY ("ownerMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Dados demo existentes: mover despesas de casa para FAMILY
UPDATE "Expense" SET "scope" = 'FAMILY'
WHERE "storeName" IN ('Continente','Pingo Doce','EDP','EPAL','NOS','Senhorio','Via Verde','Operadoras')
   OR "description" ILIKE '%renda%'
   OR "description" ILIKE '%casa%';
