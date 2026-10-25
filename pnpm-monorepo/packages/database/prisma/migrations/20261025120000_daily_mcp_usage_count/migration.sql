-- CreateTable
CREATE TABLE "DailyMcpUsageCount" (
    "id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyMcpUsageCount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyMcpUsageCount_day_key" ON "DailyMcpUsageCount"("day");

-- Backfills the 30 days before the day of the migration, like the midnight
-- job: each day of Europe/Berlin gets the number of its audit events through
-- the MCP server. The ids have the alphabet of the cuids.
INSERT INTO "DailyMcpUsageCount" ("id", "day", "count")
SELECT replace(gen_random_uuid()::text, '-', ''), counted_day."day", count(audit_event."id")::integer
FROM (
    SELECT (now() AT TIME ZONE 'Europe/Berlin')::date - day_offset AS "day"
    FROM generate_series(1, 30) AS day_offset
) AS counted_day
LEFT JOIN "AuditEvent" AS audit_event
    ON audit_event."triggeredViaMcp" = true
    AND audit_event."createdAt" >= counted_day."day"::timestamp AT TIME ZONE 'Europe/Berlin'
    AND audit_event."createdAt" < (counted_day."day" + 1)::timestamp AT TIME ZONE 'Europe/Berlin'
GROUP BY counted_day."day";
