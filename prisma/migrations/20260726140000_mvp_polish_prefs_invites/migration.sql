-- Preferências Nina + convite por email
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ninaTone" TEXT NOT NULL DEFAULT 'empathetic';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ninaAvatar" TEXT NOT NULL DEFAULT 'classic';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ninaVoice" TEXT;

ALTER TABLE "FamilyInvite" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "FamilyInvite" ADD COLUMN IF NOT EXISTS "inviteeName" TEXT;

CREATE INDEX IF NOT EXISTS "FamilyInvite_email_idx" ON "FamilyInvite"("email");
