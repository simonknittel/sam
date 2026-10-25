-- AlterTable
ALTER TABLE "ReadMarker" ADD COLUMN     "changelogEntryKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ReadMarker_changelogEntryKey_citizenId_key" ON "ReadMarker"("changelogEntryKey", "citizenId");

-- Each marker belongs to exactly one subject. A new subject type adds its
-- column to this list in its own migration.
ALTER TABLE "ReadMarker" DROP CONSTRAINT "ReadMarker_subject_check";
ALTER TABLE "ReadMarker" ADD CONSTRAINT "ReadMarker_subject_check" CHECK (
  num_nonnulls("taskId", "eventId", "changelogEntryKey") = 1
);

-- The changelog entries become a subject of the read markers. A seen row has
-- no time, thus its marker gets the time of the migration. The app of the
-- release before this migration reads and writes "ChangelogEntrySeen", thus
-- the table stays until a later migration copies the rows again and drops it.
INSERT INTO "ReadMarker" ("id", "citizenId", "changelogEntryKey")
SELECT gen_random_uuid()::text, "citizenId", "key"
FROM "ChangelogEntrySeen"
ON CONFLICT DO NOTHING;

-- A notification about a new event or task and the read marker of its item
-- are one read state since this release. Make the existing rows agree.
--
-- First, a read notification marks its item as read, at the time of the
-- first read notification. Items that were deleted have no marker.
INSERT INTO "ReadMarker" ("id", "citizenId", "readAt", "eventId")
SELECT gen_random_uuid()::text, notification."citizenId", MIN(notification."readAt"), event."id"
FROM "OnSiteNotification" notification
JOIN "Event" event ON event."id" = notification."payload"->>'eventId'
WHERE notification."notificationType" = 'event_created'
  AND notification."payloadVersion" = 1
  AND notification."readAt" IS NOT NULL
GROUP BY notification."citizenId", event."id"
ON CONFLICT DO NOTHING;

INSERT INTO "ReadMarker" ("id", "citizenId", "readAt", "taskId")
SELECT gen_random_uuid()::text, notification."citizenId", MIN(notification."readAt"), task."id"
FROM "OnSiteNotification" notification
JOIN "Task" task ON task."id" = notification."payload"->>'taskId'
WHERE notification."notificationType" = 'task_created'
  AND notification."payloadVersion" = 1
  AND notification."readAt" IS NOT NULL
GROUP BY notification."citizenId", task."id"
ON CONFLICT DO NOTHING;

-- Then, a read item marks its unread notifications as read. A notification
-- that arrived after the read gets its own creation time.
UPDATE "OnSiteNotification" notification
SET "readAt" = GREATEST(marker."readAt", notification."createdAt")
FROM "ReadMarker" marker
WHERE notification."readAt" IS NULL
  AND notification."notificationType" = 'event_created'
  AND notification."payloadVersion" = 1
  AND marker."citizenId" = notification."citizenId"
  AND marker."eventId" = notification."payload"->>'eventId';

UPDATE "OnSiteNotification" notification
SET "readAt" = GREATEST(marker."readAt", notification."createdAt")
FROM "ReadMarker" marker
WHERE notification."readAt" IS NULL
  AND notification."notificationType" = 'task_created'
  AND notification."payloadVersion" = 1
  AND marker."citizenId" = notification."citizenId"
  AND marker."taskId" = notification."payload"->>'taskId';
