CREATE TYPE "ConnectionKind" AS ENUM ('BANKING', 'CARD', 'WALLET', 'EMAIL', 'RETAIL', 'LOYALTY', 'FUEL', 'AUTO', 'UTILITY', 'TELECOM', 'INSURANCE', 'TAX', 'INVESTMENT', 'OTHER');
CREATE TYPE "ConnectionStatus" AS ENUM ('AUTHORIZED', 'PAUSED', 'ERROR');
CREATE TYPE "AutomationLevel" AS ENUM ('VOICE', 'VOICE_OCR', 'VOICE_EMAIL', 'VOICE_BANK', 'VOICE_BANK_EMAIL_RETAIL', 'FULL');

ALTER TABLE "User" ADD COLUMN "automationLevel" "AutomationLevel" NOT NULL DEFAULT 'VOICE';

CREATE TABLE "NinaConnection" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "ConnectionKind" NOT NULL DEFAULT 'OTHER',
    "status" "ConnectionStatus" NOT NULL DEFAULT 'AUTHORIZED',
    "autoImport" BOOLEAN NOT NULL DEFAULT true,
    "importProvider" "ImportProvider",
    "lastSyncAt" TIMESTAMP(3),
    "lastMessage" TEXT,
    "metadataJson" TEXT,
    "authorizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NinaConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NinaConnection_familyId_providerKey_key" ON "NinaConnection"("familyId", "providerKey");
CREATE INDEX "NinaConnection_familyId_status_idx" ON "NinaConnection"("familyId", "status");
CREATE INDEX "NinaConnection_userId_idx" ON "NinaConnection"("userId");

ALTER TABLE "NinaConnection" ADD CONSTRAINT "NinaConnection_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NinaConnection" ADD CONSTRAINT "NinaConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
