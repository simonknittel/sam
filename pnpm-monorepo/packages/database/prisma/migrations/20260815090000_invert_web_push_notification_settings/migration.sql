-- Inverts WEB_PUSH notification settings from opt-in to opt-out: until now a
-- row meant "enabled", afterwards a row means "disabled". Citizens with at
-- least one WEB_PUSH row have customized their settings and keep their exact
-- effective selection: they get the complement set (all types below minus
-- their enabled ones) as disabled-rows. Citizens without rows stay row-less,
-- which now means "everything enabled". The type list is a snapshot of
-- NOTIFICATION_TYPES at the time of this migration (including the currently
-- unused changelog_entry_created, to preserve the exact checkbox state).
-- Ids are UUIDs instead of the client's cuid2 — only uniqueness matters.
--
-- Everything happens in a single statement because `prisma migrate deploy`
-- runs each statement on its own: all CTEs read the snapshot from before the
-- DELETE, so the complement is computed from the original rows, and the
-- statement is atomic on its own.

WITH "customizers" AS (
    SELECT DISTINCT "citizenId"
    FROM "NotificationSetting"
    WHERE "channel" = 'WEB_PUSH'
),
"types" ("notificationType") AS (
    VALUES
        ('changelog_entry_created'),
        ('event_created'),
        ('event_updated'),
        ('event_deleted'),
        ('event_lineup_enabled'),
        ('event_briefing_published'),
        ('event_starting'),
        ('role_added'),
        ('silc_transaction_created'),
        ('sincome_payout_started'),
        ('sincome_payout_disbursed'),
        ('penalty_entry_created'),
        ('task_assignment_updated'),
        ('wiki_page_reported'),
        ('wiki_citizen_mentioned')
),
"complement" AS (
    SELECT
        "customizers"."citizenId",
        "types"."notificationType"
    FROM "customizers"
    CROSS JOIN "types"
    WHERE NOT EXISTS (
        SELECT 1 FROM "NotificationSetting" "s"
        WHERE "s"."citizenId" = "customizers"."citizenId"
            AND "s"."notificationType" = "types"."notificationType"
            AND "s"."channel" = 'WEB_PUSH'
    )
),
"removed" AS (
    DELETE FROM "NotificationSetting" WHERE "channel" = 'WEB_PUSH'
)
INSERT INTO "NotificationSetting" ("id", "citizenId", "notificationType", "channel", "enabledAt")
SELECT
    gen_random_uuid()::text,
    "citizenId",
    "notificationType",
    'WEB_PUSH',
    CURRENT_TIMESTAMP
FROM "complement";

-- Row existence now means "disabled"
ALTER TABLE "NotificationSetting" RENAME COLUMN "enabledAt" TO "disabledAt";
