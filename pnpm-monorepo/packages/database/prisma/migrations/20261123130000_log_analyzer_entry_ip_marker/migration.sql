-- M3 of the Remote Control Program (docs/remote-control-program/migration.md):
-- replace the IP addresses in the stored raw lines with the marker, calculate
-- the new hash, and keep the oldest row when two rows of the same owner then
-- have the same hash. Each value comes from the current values of the row,
-- thus a second run changes nothing.

-- 1. Calculate the new values of all rows.
--    The IP rule of packages/domain/src/remoteControlProgram/ipAddressMarker.ts
--    (the same values are in remote-control-program-fixtures/ip-address-marker/rule.json):
--    replace all matches of the IPv6 expression two times, then all matches
--    of the IPv4 expression two times. The backslashes in the strings need
--    standard_conforming_strings (the default of PostgreSQL).
--    The hash of packages/domain/src/remoteControlProgram/logEntryHash.ts:
--    SHA-256 of the oldest type of the pattern chain (`supersedes`), a line
--    feed and the raw line with the marker. The CASE has each type that
--    supersedes a different type. A type without a pattern is its own oldest
--    type.
CREATE TEMPORARY TABLE log_analyzer_entry_ip_marker AS
WITH ip_address_rule (ipv6_pattern, ipv4_pattern) AS (
    VALUES (
        '((?:^|[^0-9A-Za-z_.:]):?|[G-Zg-z_][0-9A-Fa-f]*:|(?:^|[^0-9A-Za-z_.])(?:[0-9A-Fa-f]{5,}|(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9]):[0-9]+):|\.[0-9A-Fa-f]*:)(?:\[(?:(?:[0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}|(?:[0-9A-Fa-f]{1,4}:){1,7}:|(?:[0-9A-Fa-f]{1,4}:){1,6}:[0-9A-Fa-f]{1,4}|(?:[0-9A-Fa-f]{1,4}:){1,5}(?::[0-9A-Fa-f]{1,4}){1,2}|(?:[0-9A-Fa-f]{1,4}:){1,4}(?::[0-9A-Fa-f]{1,4}){1,3}|(?:[0-9A-Fa-f]{1,4}:){1,3}(?::[0-9A-Fa-f]{1,4}){1,4}|(?:[0-9A-Fa-f]{1,4}:){1,2}(?::[0-9A-Fa-f]{1,4}){1,5}|[0-9A-Fa-f]{1,4}:(?::[0-9A-Fa-f]{1,4}){1,6}|:(?::[0-9A-Fa-f]{1,4}){1,7}|(?:[0-9A-Fa-f]{1,4}:){6}(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])|(?:[0-9A-Fa-f]{1,4}:){1,5}:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])|(?:[0-9A-Fa-f]{1,4}:){1,4}:[0-9A-Fa-f]{1,4}:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])|(?:[0-9A-Fa-f]{1,4}:){1,3}(?::[0-9A-Fa-f]{1,4}){1,2}:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])|(?:[0-9A-Fa-f]{1,4}:){1,2}(?::[0-9A-Fa-f]{1,4}){1,3}:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])|[0-9A-Fa-f]{1,4}:(?::[0-9A-Fa-f]{1,4}){1,4}:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])|:(?::[0-9A-Fa-f]{1,4}){0,5}:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9]))\]:[0-9]+|(?:(?:[0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}|(?:[0-9A-Fa-f]{1,4}:){1,7}:|(?:[0-9A-Fa-f]{1,4}:){1,6}:[0-9A-Fa-f]{1,4}|(?:[0-9A-Fa-f]{1,4}:){1,5}(?::[0-9A-Fa-f]{1,4}){1,2}|(?:[0-9A-Fa-f]{1,4}:){1,4}(?::[0-9A-Fa-f]{1,4}){1,3}|(?:[0-9A-Fa-f]{1,4}:){1,3}(?::[0-9A-Fa-f]{1,4}){1,4}|(?:[0-9A-Fa-f]{1,4}:){1,2}(?::[0-9A-Fa-f]{1,4}){1,5}|[0-9A-Fa-f]{1,4}:(?::[0-9A-Fa-f]{1,4}){1,6}|:(?::[0-9A-Fa-f]{1,4}){1,7}|(?:[0-9A-Fa-f]{1,4}:){6}(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])|(?:[0-9A-Fa-f]{1,4}:){1,5}:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])|(?:[0-9A-Fa-f]{1,4}:){1,4}:[0-9A-Fa-f]{1,4}:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])|(?:[0-9A-Fa-f]{1,4}:){1,3}(?::[0-9A-Fa-f]{1,4}){1,2}:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])|(?:[0-9A-Fa-f]{1,4}:){1,2}(?::[0-9A-Fa-f]{1,4}){1,3}:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])|[0-9A-Fa-f]{1,4}:(?::[0-9A-Fa-f]{1,4}){1,4}:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])|:(?::[0-9A-Fa-f]{1,4}){0,5}:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9]))(?::[0-9]+)?)([^0-9A-Za-z_.:]|[.:][^0-9A-Za-z_]|[.:]?$)',
        '(^|[^0-9A-Za-z_.])(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])(?::[0-9]+)?([^0-9A-Za-z_.]|\.[^0-9A-Za-z_]|\.?$)'
    )
),
-- MATERIALIZED: two columns use the line, and PostgreSQL must calculate it
-- only one time.
entry_with_marker AS MATERIALIZED (
    SELECT
        entry."id",
        entry."createdById",
        entry."createdAt",
        entry."type",
        regexp_replace(
            regexp_replace(
                CASE
                    -- Each form of the IPv6 expression contains "::" or six
                    -- groups that end with ":". A line without them has no
                    -- IPv6 address. Thus the slow IPv6 expression runs only
                    -- on the other lines, and the result stays the same.
                    WHEN entry."rawLine" ~ '::|([0-9A-Fa-f]{1,4}:){6}' THEN
                        regexp_replace(
                            regexp_replace(entry."rawLine", rule.ipv6_pattern, '\1IP_REDACTED\2', 'g'),
                            rule.ipv6_pattern, '\1IP_REDACTED\2', 'g'
                        )
                    ELSE entry."rawLine"
                END,
                rule.ipv4_pattern, '\1IP_REDACTED\2', 'g'
            ),
            rule.ipv4_pattern, '\1IP_REDACTED\2', 'g'
        ) AS raw_line
    FROM "LogAnalyzerEntry" AS entry
    CROSS JOIN ip_address_rule AS rule
)
SELECT
    "id" AS id,
    "createdById" AS created_by_id,
    "createdAt" AS created_at,
    raw_line,
    encode(
        sha256(convert_to(
            CASE "type"
                WHEN 'contractCompleteNotificationV2' THEN 'contractCompleteNotification'
                WHEN 'contractFailedNotificationV2' THEN 'contractFailedNotification'
                WHEN 'contractWithdrawnNotificationV2' THEN 'contractWithdrawnNotification'
                WHEN 'earnedNotificationV2' THEN 'earnedNotification'
                ELSE "type"
            END || E'\n' || raw_line,
            'UTF8'
        )),
        'hex'
    ) AS hash
FROM entry_with_marker;

-- Autovacuum does not analyze a temporary table. The statistics give good
-- plans to the next steps.
ANALYZE log_analyzer_entry_ip_marker;

-- 2. When two rows of the same owner have the same new hash, keep the oldest
--    row (by "createdAt", then by "id") and delete the others. The rows
--    without an owner (a deleted citizen) stay: the unique index permits
--    equal hashes there (NULL values are distinct), and the rows can come
--    from different citizens.
DELETE FROM "LogAnalyzerEntry"
WHERE "id" IN (
    SELECT id
    FROM (
        SELECT
            id,
            row_number() OVER (
                PARTITION BY created_by_id, hash
                ORDER BY created_at, id
            ) AS position_in_group
        FROM log_analyzer_entry_ip_marker
        WHERE created_by_id IS NOT NULL
    ) AS entry_in_group
    WHERE position_in_group > 1
);

-- 3. Write the new values of the rows that change. The unique index
--    ("createdById", "hash") checks each row at once, and step 2 came first.
--    Thus the index never has two equal hashes of one owner: the new hash of
--    a row is equal to the current hash of a different row only when the
--    different row has the oldest type and the same line with the marker
--    (for example the V1 row and the V2 row of one line). Then the new hash
--    of the different row is equal to its current hash, and step 2 deleted
--    one of the two rows.
UPDATE "LogAnalyzerEntry" AS entry
SET
    "rawLine" = new_value.raw_line,
    "hash" = new_value.hash
FROM log_analyzer_entry_ip_marker AS new_value
WHERE entry."id" = new_value.id
    AND (entry."rawLine" <> new_value.raw_line OR entry."hash" <> new_value.hash);

DROP TABLE log_analyzer_entry_ip_marker;
