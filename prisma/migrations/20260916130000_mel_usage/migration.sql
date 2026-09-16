-- MEL OpenAI usage tracking (no sensitive financial content).
-- Additive only — safe for existing data.

CREATE TABLE IF NOT EXISTS "MelUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyId" TEXT,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostMicros" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MelUsage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MelUsage_userId_createdAt_idx" ON "MelUsage"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "MelUsage_familyId_createdAt_idx" ON "MelUsage"("familyId", "createdAt");
CREATE INDEX IF NOT EXISTS "MelUsage_createdAt_idx" ON "MelUsage"("createdAt");

DO $$ BEGIN
  ALTER TABLE "MelUsage" ADD CONSTRAINT "MelUsage_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MelUsage" ADD CONSTRAINT "MelUsage_familyId_fkey"
    FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
