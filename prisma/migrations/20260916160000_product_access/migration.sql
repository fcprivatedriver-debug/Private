-- Product access (TESTER) — separado de FamilyRole. Additive only.

CREATE TYPE "ProductAccessKind" AS ENUM ('TESTER', 'SUBSCRIPTION');
CREATE TYPE "ProductAccessStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED', 'REVOKED', 'PAST_DUE', 'CANCELLED');

CREATE TABLE IF NOT EXISTS "ProductAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ProductAccessKind" NOT NULL,
    "status" "ProductAccessStatus" NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "grantedBy" TEXT,
    "notes" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductAccess_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProductAccess_userId_kind_status_idx" ON "ProductAccess"("userId", "kind", "status");
CREATE INDEX IF NOT EXISTS "ProductAccess_endsAt_idx" ON "ProductAccess"("endsAt");

DO $$ BEGIN
  ALTER TABLE "ProductAccess" ADD CONSTRAINT "ProductAccess_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
