-- Denormalized tag names on the page row make tags searchable through the
-- FTS expression index, which cannot span the tag tables.
ALTER TABLE "WikiPage" ADD COLUMN "tagsText" TEXT NOT NULL DEFAULT '';

UPDATE "WikiPage"
SET "tagsText" = "assigned"."names"
FROM (
    SELECT
        "WikiPageTag"."pageId",
        string_agg("WikiTag"."name", ' ' ORDER BY "WikiTag"."name") AS "names"
    FROM "WikiPageTag"
    INNER JOIN "WikiTag" ON "WikiTag"."id" = "WikiPageTag"."tagId"
    GROUP BY "WikiPageTag"."pageId"
) AS "assigned"
WHERE "assigned"."pageId" = "WikiPage"."id";

-- The expression must match the one used at query time in searchWikiPages
-- exactly.
DROP INDEX "WikiPage_fts_idx";
CREATE INDEX "WikiPage_fts_idx" ON "WikiPage" USING GIN (to_tsvector('german', "title" || ' ' || "tagsText" || ' ' || "searchText"));
