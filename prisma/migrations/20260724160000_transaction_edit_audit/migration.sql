-- AlterTable
ALTER TABLE "Family" ADD COLUMN IF NOT EXISTS "allowMembersEditOthers" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Income" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "TransactionAuditLog" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorDisplayName" TEXT NOT NULL,
    "summary" TEXT,
    "payloadJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TransactionAuditLog_familyId_recordId_idx" ON "TransactionAuditLog"("familyId", "recordId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TransactionAuditLog_familyId_createdAt_idx" ON "TransactionAuditLog"("familyId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TransactionAuditLog_kind_recordId_idx" ON "TransactionAuditLog"("kind", "recordId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Income" ADD CONSTRAINT "Income_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Expense" ADD CONSTRAINT "Expense_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TransactionAuditLog" ADD CONSTRAINT "TransactionAuditLog_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TransactionAuditLog" ADD CONSTRAINT "TransactionAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
