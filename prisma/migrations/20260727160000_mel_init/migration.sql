-- Mel init: schema isolado na Neon partilhada (ZRIK continua em public)
CREATE SCHEMA IF NOT EXISTS "mel";

CREATE TYPE "mel"."ModuleId" AS ENUM ('TASKS', 'CALENDAR', 'VOICE', 'REPORTS', 'HABITS', 'REMINDERS');
CREATE TYPE "mel"."TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED');
CREATE TYPE "mel"."TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "mel"."HabitFrequency" AS ENUM ('DAILY', 'WEEKLY', 'CUSTOM');
CREATE TYPE "mel"."ReminderStatus" AS ENUM ('SCHEDULED', 'SENT', 'DISMISSED', 'CANCELLED');
CREATE TYPE "mel"."CaptureIntent" AS ENUM ('TASK', 'EVENT', 'REMINDER', 'HABIT', 'NOTE', 'UNKNOWN');
CREATE TYPE "mel"."MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

CREATE TABLE "mel"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "pinHash" TEXT,
    "biometricsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "biometricCredentialId" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "locale" TEXT NOT NULL DEFAULT 'pt',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Lisbon',
    "melTone" TEXT NOT NULL DEFAULT 'warm',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "mel"."User"("email");

CREATE TABLE "mel"."AuthAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "AuthAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthAccount_provider_providerAccountId_key" ON "mel"."AuthAccount"("provider", "providerAccountId");

CREATE TABLE "mel"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Session_sessionToken_key" ON "mel"."Session"("sessionToken");

CREATE TABLE "mel"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "VerificationToken_token_key" ON "mel"."VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "mel"."VerificationToken"("identifier", "token");

CREATE TABLE "mel"."UserModule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" "mel"."ModuleId" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserModule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserModule_userId_moduleId_key" ON "mel"."UserModule"("userId", "moduleId");
CREATE INDEX "UserModule_userId_idx" ON "mel"."UserModule"("userId");

CREATE TABLE "mel"."Task" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "status" "mel"."TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "mel"."TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'manual',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Task_userId_status_idx" ON "mel"."Task"("userId", "status");
CREATE INDEX "Task_userId_dueAt_idx" ON "mel"."Task"("userId", "dueAt");

CREATE TABLE "mel"."CalendarEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "externalId" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CalendarEvent_userId_startsAt_idx" ON "mel"."CalendarEvent"("userId", "startsAt");

CREATE TABLE "mel"."Habit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "frequency" "mel"."HabitFrequency" NOT NULL DEFAULT 'DAILY',
    "targetPerWeek" INTEGER,
    "color" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Habit_userId_active_idx" ON "mel"."Habit"("userId", "active");

CREATE TABLE "mel"."HabitLog" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "doneAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    CONSTRAINT "HabitLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HabitLog_habitId_doneAt_idx" ON "mel"."HabitLog"("habitId", "doneAt");

CREATE TABLE "mel"."Reminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "status" "mel"."ReminderStatus" NOT NULL DEFAULT 'SCHEDULED',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "relatedTaskId" TEXT,
    "relatedEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Reminder_userId_remindAt_idx" ON "mel"."Reminder"("userId", "remindAt");
CREATE INDEX "Reminder_userId_status_idx" ON "mel"."Reminder"("userId", "status");

CREATE TABLE "mel"."VoiceCapture" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "intent" "mel"."CaptureIntent" NOT NULL DEFAULT 'UNKNOWN',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "resultJson" JSONB,
    "createdEntity" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VoiceCapture_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VoiceCapture_userId_createdAt_idx" ON "mel"."VoiceCapture"("userId", "createdAt");

CREATE TABLE "mel"."WeeklyReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "highlights" JSONB,
    "metrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WeeklyReport_userId_weekStart_key" ON "mel"."WeeklyReport"("userId", "weekStart");
CREATE INDEX "WeeklyReport_userId_weekStart_idx" ON "mel"."WeeklyReport"("userId", "weekStart");

CREATE TABLE "mel"."MelMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "mel"."MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MelMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MelMessage_userId_createdAt_idx" ON "mel"."MelMessage"("userId", "createdAt");

ALTER TABLE "mel"."AuthAccount" ADD CONSTRAINT "AuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mel"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mel"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mel"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mel"."UserModule" ADD CONSTRAINT "UserModule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mel"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mel"."Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mel"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mel"."CalendarEvent" ADD CONSTRAINT "CalendarEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mel"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mel"."Habit" ADD CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mel"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mel"."HabitLog" ADD CONSTRAINT "HabitLog_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "mel"."Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mel"."Reminder" ADD CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mel"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mel"."VoiceCapture" ADD CONSTRAINT "VoiceCapture_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mel"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mel"."WeeklyReport" ADD CONSTRAINT "WeeklyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mel"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mel"."MelMessage" ADD CONSTRAINT "MelMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "mel"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
