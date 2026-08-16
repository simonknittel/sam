-- Unifies the Discord-shaped event schema into the source-neutral model for
-- standalone ("app") events. Written by hand instead of Prisma's generated
-- diff because the diff would drop and recreate the tables:
--   * "DiscordEvent" is renamed to "Event" (Postgres keeps all incoming
--     foreign keys pointing at the renamed table; only its own indexes must
--     be renamed to the names Prisma expects for the new model).
--   * "DiscordEventParticipant" rows are copied into the new unified
--     "EventParticipant" table (source DISCORD, citizen resolved via the
--     Discord id) before the old table is dropped.

-- CreateEnum
CREATE TYPE "EventSource" AS ENUM ('DISCORD', 'APP');

-- CreateEnum
CREATE TYPE "EventVisibility" AS ENUM ('PUBLIC', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "EventActivityType" AS ENUM ('CREATED', 'TITLE_UPDATED', 'DESCRIPTION_UPDATED', 'SCHEDULE_UPDATED', 'PARTICIPATION_SIGNED_UP', 'PARTICIPATION_COMMENT_UPDATED', 'PARTICIPATION_CANCELLED', 'LINEUP_TOGGLED');

-- Rename the event table and its Discord-era column/index names in place
ALTER TABLE "DiscordEvent" RENAME TO "Event";
ALTER TABLE "Event" RENAME COLUMN "discordName" TO "name";
ALTER INDEX "DiscordEvent_pkey" RENAME TO "Event_pkey";
ALTER INDEX "DiscordEvent_discordId_key" RENAME TO "Event_discordId_key";
ALTER INDEX "DiscordEvent_startTime_idx" RENAME TO "Event_startTime_idx";
ALTER INDEX "DiscordEvent_endTime_idx" RENAME TO "Event_endTime_idx";

-- Discord identity becomes optional (absent on app events)
ALTER TABLE "Event" ALTER COLUMN "discordId" DROP NOT NULL;
ALTER TABLE "Event" ALTER COLUMN "discordCreatorId" DROP NOT NULL;

-- All pre-existing rows are Discord-sourced. The default is dropped again so
-- application code must always state the source explicitly.
ALTER TABLE "Event" ADD COLUMN "source" "EventSource" NOT NULL DEFAULT 'DISCORD';
ALTER TABLE "Event" ALTER COLUMN "source" DROP DEFAULT;

ALTER TABLE "Event" ADD COLUMN "visibility" "EventVisibility" NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "Event" ADD COLUMN "createdById" TEXT;
ALTER TABLE "Event" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Event" ADD COLUMN "deletedById" TEXT;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill the creator for Discord events whose creator matches a citizen
UPDATE "Event"
SET "createdById" = "Entity"."id"
FROM "Entity"
WHERE "Entity"."discordId" = "Event"."discordCreatorId";

-- CreateTable
CREATE TABLE "EventVisibilityRole" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventVisibilityRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventParticipant" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "source" "EventSource" NOT NULL,
    "citizenId" TEXT,
    "discordUserId" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "activeCitizenId" TEXT,
    "activeDiscordUserId" TEXT,

    CONSTRAINT "EventParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventActivity" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" "EventActivityType" NOT NULL,
    "payload" JSONB,
    "citizenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventVisibilityRole_eventId_roleId_key" ON "EventVisibilityRole"("eventId", "roleId");

-- CreateIndex
CREATE INDEX "EventParticipant_citizenId_idx" ON "EventParticipant"("citizenId");

-- CreateIndex
CREATE INDEX "EventParticipant_discordUserId_idx" ON "EventParticipant"("discordUserId");

-- CreateIndex
CREATE UNIQUE INDEX "EventParticipant_eventId_activeCitizenId_key" ON "EventParticipant"("eventId", "activeCitizenId");

-- CreateIndex
CREATE UNIQUE INDEX "EventParticipant_eventId_activeDiscordUserId_key" ON "EventParticipant"("eventId", "activeDiscordUserId");

-- CreateIndex
CREATE INDEX "EventActivity_eventId_createdAt_idx" ON "EventActivity"("eventId", "createdAt");

-- AddForeignKey
ALTER TABLE "EventVisibilityRole" ADD CONSTRAINT "EventVisibilityRole_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventVisibilityRole" ADD CONSTRAINT "EventVisibilityRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventActivity" ADD CONSTRAINT "EventActivity_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventActivity" ADD CONSTRAINT "EventActivity_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Copy the Discord participants into the unified table. The citizen is
-- resolved via the Discord id where possible; the active-key mirror columns
-- start out filled because every copied row is an active participation.
INSERT INTO "EventParticipant" ("id", "eventId", "source", "citizenId", "discordUserId", "createdAt", "activeCitizenId", "activeDiscordUserId")
SELECT
    "DiscordEventParticipant"."id",
    "DiscordEventParticipant"."eventId",
    'DISCORD',
    "Entity"."id",
    "DiscordEventParticipant"."discordUserId",
    "DiscordEventParticipant"."createdAt",
    "Entity"."id",
    "DiscordEventParticipant"."discordUserId"
FROM "DiscordEventParticipant"
LEFT JOIN "Entity" ON "Entity"."discordId" = "DiscordEventParticipant"."discordUserId";

-- DropTable
DROP TABLE "DiscordEventParticipant";
