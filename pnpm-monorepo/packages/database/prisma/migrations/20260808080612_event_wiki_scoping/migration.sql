-- CreateEnum
CREATE TYPE "WikiPageEventScope" AS ENUM ('INHERIT', 'MANAGERS', 'PARTICIPANTS', 'POSITION', 'ALL');

-- AlterEnum
ALTER TYPE "WikiPageNamespace" ADD VALUE 'EVENT';

-- AlterTable
ALTER TABLE "DiscordEvent" ADD COLUMN     "briefingPublishedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WikiPage" ADD COLUMN     "eventEditScope" "WikiPageEventScope" NOT NULL DEFAULT 'INHERIT',
ADD COLUMN     "eventEditScopePositionId" TEXT,
ADD COLUMN     "eventId" TEXT,
ADD COLUMN     "eventReadScope" "WikiPageEventScope" NOT NULL DEFAULT 'INHERIT',
ADD COLUMN     "eventReadScopePositionId" TEXT;

-- AlterTable
ALTER TABLE "WikiTag" ADD COLUMN     "eventId" TEXT;

-- A page belongs to an event exactly when its namespace is EVENT. The
-- namespace filters all over the app rely on this invariant. The column is
-- compared as text because the EVENT enum value added above cannot be used
-- inside the transaction that adds it.
ALTER TABLE "WikiPage" ADD CONSTRAINT "WikiPage_namespace_eventId_check" CHECK (("namespace"::text = 'EVENT') = ("eventId" IS NOT NULL));

-- Tag names are unique per scope: once globally (eventId NULL), once per
-- event. Two partial indexes replace the plain unique index because a
-- compound unique would treat every NULL eventId as distinct and stop
-- deduplicating global tags. Prisma cannot express partial indexes; keep
-- these in sync with the WikiTag model comment.
DROP INDEX "WikiTag_name_key";
CREATE UNIQUE INDEX "WikiTag_global_name_key" ON "WikiTag"("name") WHERE "eventId" IS NULL;
CREATE UNIQUE INDEX "WikiTag_eventId_name_key" ON "WikiTag"("eventId", "name") WHERE "eventId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "WikiPage_eventId_idx" ON "WikiPage"("eventId");

-- CreateIndex
CREATE INDEX "WikiTag_eventId_idx" ON "WikiTag"("eventId");

-- AddForeignKey
ALTER TABLE "WikiPage" ADD CONSTRAINT "WikiPage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "DiscordEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPage" ADD CONSTRAINT "WikiPage_eventReadScopePositionId_fkey" FOREIGN KEY ("eventReadScopePositionId") REFERENCES "EventPosition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPage" ADD CONSTRAINT "WikiPage_eventEditScopePositionId_fkey" FOREIGN KEY ("eventEditScopePositionId") REFERENCES "EventPosition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiTag" ADD CONSTRAINT "WikiTag_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "DiscordEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
