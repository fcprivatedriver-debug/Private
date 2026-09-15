-- CreateTable: ledger do Saving Engine (poupanças geradas pela Nina)
CREATE TABLE IF NOT EXISTS "NinaImpact" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT,
    "category" TEXT NOT NULL,
    "sourceEngine" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "timeMinutes" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "dataJson" TEXT,
    "followed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NinaImpact_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "NinaImpact_familyId_createdAt_idx" ON "NinaImpact"("familyId", "createdAt");
CREATE INDEX IF NOT EXISTS "NinaImpact_familyId_category_createdAt_idx" ON "NinaImpact"("familyId", "category", "createdAt");
CREATE INDEX IF NOT EXISTS "NinaImpact_familyId_sourceEngine_idx" ON "NinaImpact"("familyId", "sourceEngine");

DO $$ BEGIN
  ALTER TABLE "NinaImpact" ADD CONSTRAINT "NinaImpact_familyId_fkey"
    FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "NinaImpact" ADD CONSTRAINT "NinaImpact_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
