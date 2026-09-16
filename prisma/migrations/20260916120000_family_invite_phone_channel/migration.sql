-- Additive only: phone on User; channel/phone/revokedAt on FamilyInvite.
-- Safe for existing data (nullable / defaults).

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneVerified" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");

ALTER TABLE "FamilyInvite" ADD COLUMN IF NOT EXISTS "channel" TEXT NOT NULL DEFAULT 'LINK';
ALTER TABLE "FamilyInvite" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "FamilyInvite" ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "FamilyInvite_phone_idx" ON "FamilyInvite"("phone");
