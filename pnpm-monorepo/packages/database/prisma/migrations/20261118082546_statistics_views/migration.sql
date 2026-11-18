-- The schema `statistics` holds the views that the readers of the statistics
-- use: the dashboard and the MCP tools. The views are not in the Prisma
-- models. A view gives the numbers of complete days in Europe/Berlin, and it
-- holds no personal data. The views run with the rights of their owner. A
-- reader role with rights on this schema only can thus read them (see
-- `prisma/statistics-reader-role.sql`).
--
-- The days of the statistics: from 2025-12-02 (the first day with values in
-- the statistics tables) until yesterday in Europe/Berlin. Today is not
-- complete.
--
-- Each view reads a table of the schema `public`, and PostgreSQL refuses a
-- change of a column that a view uses. See docs/changing-database-schema.md.

-- The infrastructure can make the schema before this migration
CREATE SCHEMA IF NOT EXISTS statistics;

-- The snapshot tables: the midnight jobs write the values of a day after its
-- end. The name of a variant or a role is its current name.

-- The total number of ships of a day is the sum of all variants.
-- security_barrier: a function in the WHERE of a reader sees only the rows of
-- the view. Without it, the function can run before the join, thus also on
-- the name of a variant without a count row.
CREATE VIEW statistics.daily_ship_counts WITH (security_barrier) AS
SELECT
    ship_count."day",
    ship_count."variantId" AS variant_id,
    variant."name" AS variant_name,
    ship_count."count" AS ship_count
FROM "VariantShipCount" AS ship_count
JOIN "Variant" AS variant ON variant."id" = ship_count."variantId"
WHERE ship_count."day" BETWEEN DATE '2025-12-02' AND (now() AT TIME ZONE 'Europe/Berlin')::date - 1;

CREATE VIEW statistics.daily_fleet_values AS
SELECT
    "day",
    "storeValueUsdCents" AS store_value_usd_cents,
    "inGameValueUsdCents" AS in_game_value_usd_cents,
    "unknownValueUsdCents" AS unknown_value_usd_cents,
    "storeValueAuec" AS store_value_auec,
    "inGameValueAuec" AS in_game_value_auec,
    "unknownValueAuec" AS unknown_value_auec
FROM "DailyFleetValue"
WHERE "day" BETWEEN DATE '2025-12-02' AND (now() AT TIME ZONE 'Europe/Berlin')::date - 1;

CREATE VIEW statistics.daily_login_counts AS
SELECT
    "date" AS "day",
    "count" AS login_count
FROM "DailyLoginCount"
WHERE "date" BETWEEN DATE '2025-12-02' AND (now() AT TIME ZONE 'Europe/Berlin')::date - 1;

-- security_barrier: see statistics.daily_ship_counts
CREATE VIEW statistics.daily_role_citizen_counts WITH (security_barrier) AS
SELECT
    citizen_count."day",
    citizen_count."roleId" AS role_id,
    role."name" AS role_name,
    citizen_count."count" AS citizen_count
FROM "RoleCitizenCount" AS citizen_count
JOIN "Role" AS role ON role."id" = citizen_count."roleId"
WHERE citizen_count."day" BETWEEN DATE '2025-12-02' AND (now() AT TIME ZONE 'Europe/Berlin')::date - 1;

CREATE VIEW statistics.daily_mcp_usage_counts AS
SELECT
    "day",
    "count" AS audit_event_count
FROM "DailyMcpUsageCount"
WHERE "day" BETWEEN DATE '2025-12-02' AND (now() AT TIME ZONE 'Europe/Berlin')::date - 1;

-- The lists for the filters: only the variants and the roles with a count
-- above 0 on a day of the statistics. The midnight jobs write a count for
-- each variant and role, also 0. A series without a count above 0 shows no
-- line, thus a filter does not offer it.
CREATE VIEW statistics.ship_variants AS
SELECT DISTINCT variant_id, variant_name
FROM statistics.daily_ship_counts
WHERE ship_count > 0;

CREATE VIEW statistics.roles AS
SELECT DISTINCT role_id, role_name
FROM statistics.daily_role_citizen_counts
WHERE citizen_count > 0;

-- The live tables: one row for each day of the statistics, also for a day
-- without a row in the table. The day of a time is its day in
-- Europe/Berlin. A total counts the rows that were created on the day or
-- before it, also before the first day of the statistics.

-- A deleted citizen counts for no day
CREATE VIEW statistics.daily_citizen_totals AS
WITH statistic_days AS (
    SELECT DATE '2025-12-02' + day_offset AS "day"
    FROM generate_series(0, (now() AT TIME ZONE 'Europe/Berlin')::date - 1 - DATE '2025-12-02') AS day_offset
),
creations AS (
    SELECT ("createdAt" AT TIME ZONE 'Europe/Berlin')::date AS "day", count(*) AS creation_count
    FROM "Citizen"
    WHERE "deletedAt" IS NULL
    GROUP BY 1
)
SELECT
    statistic_days."day",
    (
        (SELECT coalesce(sum(creation_count), 0) FROM creations WHERE creations."day" < DATE '2025-12-02')
        + sum(coalesce(creations.creation_count, 0)) OVER (ORDER BY statistic_days."day")
    )::integer AS citizen_total
FROM statistic_days
LEFT JOIN creations ON creations."day" = statistic_days."day";

CREATE VIEW statistics.daily_organization_totals AS
WITH statistic_days AS (
    SELECT DATE '2025-12-02' + day_offset AS "day"
    FROM generate_series(0, (now() AT TIME ZONE 'Europe/Berlin')::date - 1 - DATE '2025-12-02') AS day_offset
),
creations AS (
    SELECT ("createdAt" AT TIME ZONE 'Europe/Berlin')::date AS "day", count(*) AS creation_count
    FROM "Organization"
    GROUP BY 1
)
SELECT
    statistic_days."day",
    (
        (SELECT coalesce(sum(creation_count), 0) FROM creations WHERE creations."day" < DATE '2025-12-02')
        + sum(coalesce(creations.creation_count, 0)) OVER (ORDER BY statistic_days."day")
    )::integer AS organization_total
FROM statistic_days
LEFT JOIN creations ON creations."day" = statistic_days."day";

-- A user without a creation time counts for no day
CREATE VIEW statistics.daily_user_totals AS
WITH statistic_days AS (
    SELECT DATE '2025-12-02' + day_offset AS "day"
    FROM generate_series(0, (now() AT TIME ZONE 'Europe/Berlin')::date - 1 - DATE '2025-12-02') AS day_offset
),
creations AS (
    SELECT ("createdAt" AT TIME ZONE 'Europe/Berlin')::date AS "day", count(*) AS creation_count
    FROM "User"
    WHERE "createdAt" IS NOT NULL
    GROUP BY 1
)
SELECT
    statistic_days."day",
    (
        (SELECT coalesce(sum(creation_count), 0) FROM creations WHERE creations."day" < DATE '2025-12-02')
        + sum(coalesce(creations.creation_count, 0)) OVER (ORDER BY statistic_days."day")
    )::integer AS user_total
FROM statistic_days
LEFT JOIN creations ON creations."day" = statistic_days."day";

-- The events that start on the day
CREATE VIEW statistics.daily_event_counts AS
WITH statistic_days AS (
    SELECT DATE '2025-12-02' + day_offset AS "day"
    FROM generate_series(0, (now() AT TIME ZONE 'Europe/Berlin')::date - 1 - DATE '2025-12-02') AS day_offset
),
starts AS (
    SELECT ("startTime" AT TIME ZONE 'Europe/Berlin')::date AS "day", count(*) AS event_count
    FROM "Event"
    WHERE "deletedAt" IS NULL
    GROUP BY 1
)
SELECT
    statistic_days."day",
    coalesce(starts.event_count, 0)::integer AS event_count
FROM statistic_days
LEFT JOIN starts ON starts."day" = statistic_days."day";

-- The sum of the positive transactions of the day that are not deleted
CREATE VIEW statistics.daily_new_silc AS
WITH statistic_days AS (
    SELECT DATE '2025-12-02' + day_offset AS "day"
    FROM generate_series(0, (now() AT TIME ZONE 'Europe/Berlin')::date - 1 - DATE '2025-12-02') AS day_offset
),
bookings AS (
    SELECT ("createdAt" AT TIME ZONE 'Europe/Berlin')::date AS "day", sum("value") AS new_silc
    FROM "SilcTransaction"
    WHERE "deletedAt" IS NULL AND "value" > 0
    GROUP BY 1
)
SELECT
    statistic_days."day",
    coalesce(bookings.new_silc, 0) AS new_silc
FROM statistic_days
LEFT JOIN bookings ON bookings."day" = statistic_days."day";
