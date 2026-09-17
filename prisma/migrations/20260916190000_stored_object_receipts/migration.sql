-- Persistent file storage for receipts (Neon BYTEA). Additive only.

CREATE TABLE IF NOT EXISTS "StoredObject" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "backend" TEXT NOT NULL DEFAULT 'db',
    "data" BYTEA,
    "externalUrl" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StoredObject_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StoredObject_storageKey_key" ON "StoredObject"("storageKey");
CREATE INDEX IF NOT EXISTS "StoredObject_familyId_idx" ON "StoredObject"("familyId");
CREATE INDEX IF NOT EXISTS "StoredObject_createdAt_idx" ON "StoredObject"("createdAt");

DO $$ BEGIN
  ALTER TABLE "StoredObject" ADD CONSTRAINT "StoredObject_familyId_fkey"
    FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
