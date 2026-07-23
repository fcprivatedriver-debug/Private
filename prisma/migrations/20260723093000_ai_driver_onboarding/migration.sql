-- CreateTable
CREATE TABLE "DriverDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "driverProfileId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT,
    "aiAnalysis" TEXT,
    "aiScore" REAL,
    "aiFlags" TEXT NOT NULL DEFAULT '[]',
    "reviewerNotes" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DriverDocument_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "DriverDocument_driverProfileId_type_idx" ON "DriverDocument"("driverProfileId", "type");
CREATE INDEX "DriverDocument_status_idx" ON "DriverDocument"("status");

CREATE TABLE "VerificationReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "driverProfileId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "decision" TEXT,
    "riskScore" REAL,
    "confidence" REAL,
    "recommendation" TEXT,
    "findings" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "actorUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VerificationReview_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "VerificationReview_driverProfileId_createdAt_idx" ON "VerificationReview"("driverProfileId", "createdAt");

-- Rebuild DriverProfile with onboarding + AI fields
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_DriverProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "onboardingStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "onboardingStep" TEXT NOT NULL DEFAULT 'profile',
    "completenessScore" INTEGER NOT NULL DEFAULT 0,
    "photoUrl" TEXT,
    "bio" TEXT,
    "languagesSpoken" TEXT NOT NULL DEFAULT '["pt"]',
    "yearsOfExperience" INTEGER NOT NULL DEFAULT 0,
    "ratingAvg" REAL,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "completedTripsCount" INTEGER NOT NULL DEFAULT 0,
    "responseRate" REAL,
    "avgResponseTimeMinutes" REAL,
    "documents" TEXT NOT NULL DEFAULT '[]',
    "aiRiskScore" REAL,
    "aiConfidence" REAL,
    "aiSummary" TEXT,
    "adminNotes" TEXT,
    "rejectionReason" TEXT,
    "infoRequestMessage" TEXT,
    "submittedAt" DATETIME,
    "verifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DriverProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_DriverProfile" (
  "id", "userId", "status", "photoUrl", "bio", "languagesSpoken", "yearsOfExperience",
  "ratingAvg", "ratingCount", "completedTripsCount", "responseRate", "avgResponseTimeMinutes",
  "documents", "verifiedAt", "createdAt", "updatedAt",
  "onboardingStatus", "onboardingStep", "completenessScore"
)
SELECT
  "id", "userId", "status", "photoUrl", "bio", "languagesSpoken", "yearsOfExperience",
  "ratingAvg", "ratingCount", "completedTripsCount", "responseRate", "avgResponseTimeMinutes",
  "documents", "verifiedAt", "createdAt", "updatedAt",
  CASE
    WHEN "status" = 'ACTIVE' THEN 'APPROVED'
    WHEN "status" = 'REJECTED' THEN 'REJECTED'
    ELSE 'IN_PROGRESS'
  END,
  CASE WHEN "status" = 'ACTIVE' THEN 'done' ELSE 'profile' END,
  CASE WHEN "status" = 'ACTIVE' THEN 100 ELSE 20 END
FROM "DriverProfile";

DROP TABLE "DriverProfile";
ALTER TABLE "new_DriverProfile" RENAME TO "DriverProfile";
CREATE UNIQUE INDEX "DriverProfile_userId_key" ON "DriverProfile"("userId");
CREATE INDEX "DriverProfile_status_idx" ON "DriverProfile"("status");
CREATE INDEX "DriverProfile_onboardingStatus_idx" ON "DriverProfile"("onboardingStatus");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
