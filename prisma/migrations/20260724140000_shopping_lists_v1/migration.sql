-- Multiple shopping lists (V1)
CREATE TABLE "ShoppingList" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "createdById" TEXT,
    "name" TEXT NOT NULL DEFAULT 'Lista de compras',
    "isShared" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShoppingList_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShoppingList_familyId_idx" ON "ShoppingList"("familyId");

ALTER TABLE "ShoppingList" ADD CONSTRAINT "ShoppingList_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShoppingList" ADD CONSTRAINT "ShoppingList_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Attach existing items to a default list per family
ALTER TABLE "ShoppingListItem" ADD COLUMN "listId" TEXT;

INSERT INTO "ShoppingList" ("id", "familyId", "name", "isShared", "createdAt", "updatedAt")
SELECT 'list_' || f."id", f."id", 'Lista de compras', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Family" f
WHERE NOT EXISTS (SELECT 1 FROM "ShoppingList" sl WHERE sl."familyId" = f."id");

UPDATE "ShoppingListItem" i
SET "listId" = 'list_' || i."familyId"
WHERE i."listId" IS NULL;

ALTER TABLE "ShoppingListItem" ALTER COLUMN "listId" SET NOT NULL;

CREATE INDEX "ShoppingListItem_listId_isChecked_idx" ON "ShoppingListItem"("listId", "isChecked");

ALTER TABLE "ShoppingListItem" ADD CONSTRAINT "ShoppingListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "ShoppingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
