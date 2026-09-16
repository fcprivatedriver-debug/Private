-- Hash existing invite tokens (raw → sha256 hex) and add resend / role fields.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "FamilyInvite" ADD COLUMN IF NOT EXISTS "inviteRole" "FamilyRole" NOT NULL DEFAULT 'MEMBER';
ALTER TABLE "FamilyInvite" ADD COLUMN IF NOT EXISTS "lastSentAt" TIMESTAMP(3);

-- Only re-hash values that are not already 64-char sha256 hex (legacy plaintext / 48-char hex).
UPDATE "FamilyInvite"
SET "token" = encode(digest(convert_to("token", 'UTF8'), 'sha256'), 'hex')
WHERE length("token") <> 64 OR "token" !~ '^[a-f0-9]{64}$';

UPDATE "FamilyInvite"
SET "lastSentAt" = COALESCE("lastSentAt", "createdAt")
WHERE "lastSentAt" IS NULL;
