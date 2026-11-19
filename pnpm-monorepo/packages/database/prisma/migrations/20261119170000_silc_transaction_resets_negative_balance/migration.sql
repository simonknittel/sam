-- AlterTable
ALTER TABLE "SilcTransaction" ADD COLUMN     "resetsNegativeBalance" BOOLEAN NOT NULL DEFAULT false;

-- Until now, only the end of a SINcome collection phase booked a negative
-- balance to 0: with a positive transaction of the cycle
UPDATE "SilcTransaction"
SET "resetsNegativeBalance" = true
WHERE "profitDistributionCycleId" IS NOT NULL AND "value" > 0;

-- Also "expire all" books a negative balance to 0 now, without a cycle. Thus
-- the view leaves out the transactions with the new column instead of the
-- transactions of a cycle. The columns stay the same, thus the view keeps the
-- SELECT right of the reader role.
CREATE OR REPLACE VIEW statistics.daily_new_silc AS
WITH statistic_days AS (
    SELECT DATE '2025-12-02' + day_offset AS "day"
    FROM generate_series(0, (now() AT TIME ZONE 'Europe/Berlin')::date - 1 - DATE '2025-12-02') AS day_offset
),
bookings AS (
    SELECT ("createdAt" AT TIME ZONE 'Europe/Berlin')::date AS "day", sum("value") AS new_silc
    FROM "SilcTransaction"
    WHERE "deletedAt" IS NULL AND "value" > 0 AND NOT "resetsNegativeBalance"
    GROUP BY 1
)
SELECT
    statistic_days."day",
    coalesce(bookings.new_silc, 0) AS new_silc
FROM statistic_days
LEFT JOIN bookings ON bookings."day" = statistic_days."day";
