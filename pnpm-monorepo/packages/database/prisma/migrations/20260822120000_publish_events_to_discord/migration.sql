-- Publishing app events to Discord as guild scheduled events — the reverse
-- direction of the Discord sync. The publish state lives on Event,
-- EventTemplate carries the preference that prefills a new event's publish
-- settings. The hand-written CHECK constraints at the bottom keep the
-- "exactly one target" invariant the application relies on.

-- CreateEnum
CREATE TYPE "EventDiscordPublishTarget" AS ENUM ('CHANNEL', 'EXTERNAL');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "discordPublishedAt" TIMESTAMP(3),
ADD COLUMN     "discordPublishedById" TEXT,
ADD COLUMN     "discordPublishedChannelId" TEXT,
ADD COLUMN     "discordPublishedId" TEXT,
ADD COLUMN     "discordPublishedLocation" TEXT;

-- AlterTable
ALTER TABLE "EventTemplate" ADD COLUMN     "discordPublishChannelId" TEXT,
ADD COLUMN     "discordPublishLocation" TEXT,
ADD COLUMN     "discordPublishTarget" "EventDiscordPublishTarget";

-- CreateIndex
CREATE UNIQUE INDEX "Event_discordPublishedId_key" ON "Event"("discordPublishedId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_discordPublishedById_fkey" FOREIGN KEY ("discordPublishedById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- A published event points at exactly one target (a voice/stage channel or a
-- free-text location); an unpublished one at none. Unpublishing therefore has
-- to clear the target columns together with the id.
ALTER TABLE "Event" ADD CONSTRAINT "Event_discord_publish_target_check" CHECK (
  num_nonnulls("discordPublishedChannelId", "discordPublishedLocation")
    = (CASE WHEN "discordPublishedId" IS NULL THEN 0 ELSE 1 END)
);

-- The template's preference: no target at all means "do not publish". CHANNEL
-- needs its channel, EXTERNAL may leave the location empty — the created
-- event's own URL fills in, which the template cannot know upfront.
ALTER TABLE "EventTemplate" ADD CONSTRAINT "EventTemplate_discord_publish_target_check" CHECK (
  ("discordPublishTarget" IS NULL
    AND "discordPublishChannelId" IS NULL
    AND "discordPublishLocation" IS NULL)
  OR ("discordPublishTarget" = 'CHANNEL'
    AND "discordPublishChannelId" IS NOT NULL
    AND "discordPublishLocation" IS NULL)
  OR ("discordPublishTarget" = 'EXTERNAL'
    AND "discordPublishChannelId" IS NULL)
);
