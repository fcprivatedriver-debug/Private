-- AlterTable
ALTER TABLE "ShoppingListItem" ADD COLUMN IF NOT EXISTS "brand" TEXT;
ALTER TABLE "ShoppingListItem" ADD COLUMN IF NOT EXISTS "weight" TEXT;
ALTER TABLE "ShoppingListItem" ADD COLUMN IF NOT EXISTS "priceCents" INTEGER;
ALTER TABLE "ShoppingListItem" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "ShoppingListItem" ADD COLUMN IF NOT EXISTS "storeName" TEXT;
ALTER TABLE "ShoppingListItem" ADD COLUMN IF NOT EXISTS "productUrl" TEXT;
ALTER TABLE "ShoppingListItem" ADD COLUMN IF NOT EXISTS "externalProductId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProductPreference" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryKey" TEXT NOT NULL,
    "preferredName" TEXT NOT NULL,
    "brand" TEXT,
    "storeName" TEXT,
    "productUrl" TEXT,
    "imageUrl" TEXT,
    "priceCents" INTEGER,
    "useCount" INTEGER NOT NULL DEFAULT 1,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductPreference_familyId_userId_categoryKey_key"
  ON "ProductPreference"("familyId", "userId", "categoryKey");
CREATE INDEX IF NOT EXISTS "ProductPreference_familyId_userId_idx"
  ON "ProductPreference"("familyId", "userId");

DO $$ BEGIN
  ALTER TABLE "ProductPreference" ADD CONSTRAINT "ProductPreference_familyId_fkey"
    FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProductPreference" ADD CONSTRAINT "ProductPreference_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
