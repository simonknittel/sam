-- The app of the release before the migration `changelog_read_markers` wrote
-- seen rows until the release of the read markers of the changelog. Copy
-- them as that migration did, then drop the table.
INSERT INTO "ReadMarker" ("id", "citizenId", "changelogEntryKey")
SELECT gen_random_uuid()::text, "citizenId", "key"
FROM "ChangelogEntrySeen"
ON CONFLICT DO NOTHING;

-- That app also read notifications without the link to the read markers. A
-- read notification about a new event or task marks its item as read, as in
-- the migration `changelog_read_markers`. The other direction does not run
-- again: since the release, an unread notification whose item has a marker
-- is valid, because "Als ungelesen markieren" keeps the marker.
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

-- Nothing sends the notification type of new changelog entries, and the
-- settings page no longer shows it
DELETE FROM "NotificationSetting" WHERE "notificationType" = 'changelog_entry_created';

-- DropForeignKey
ALTER TABLE "ChangelogEntrySeen" DROP CONSTRAINT "ChangelogEntrySeen_citizenId_fkey";

-- DropTable
DROP TABLE "ChangelogEntrySeen";
