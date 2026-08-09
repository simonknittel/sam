-- CreateTable
CREATE TABLE "WikiPageCitizenMention" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "notifiedAt" TIMESTAMP(3),
    "suppressedAt" TIMESTAMP(3),

    CONSTRAINT "WikiPageCitizenMention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WikiPageCitizenMention_pageId_citizenId_key" ON "WikiPageCitizenMention"("pageId", "citizenId");

-- CreateIndex
CREATE INDEX "WikiPageCitizenMention_citizenId_idx" ON "WikiPageCitizenMention"("citizenId");

-- CreateIndex
CREATE INDEX "WikiPageCitizenMention_createdById_idx" ON "WikiPageCitizenMention"("createdById");

-- Hand-written partial index Prisma cannot express: the notification sweep
-- only ever scans pending rows (both timestamps NULL).
CREATE INDEX "WikiPageCitizenMention_pending_idx" ON "WikiPageCitizenMention"("createdAt")
WHERE "notifiedAt" IS NULL AND "suppressedAt" IS NULL;

-- AddForeignKey
ALTER TABLE "WikiPageCitizenMention" ADD CONSTRAINT "WikiPageCitizenMention_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageCitizenMention" ADD CONSTRAINT "WikiPageCitizenMention_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageCitizenMention" ADD CONSTRAINT "WikiPageCitizenMention_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: seed one already-suppressed row per (page, citizen) pair the
-- existing content mentions, so enabling the mention notifications never
-- notifies for pre-existing mentions. Runs atomically with the table
-- creation. Ids are UUIDs instead of the client's cuid2 — only uniqueness
-- matters. Mentions whose citizen no longer exists are skipped (the FK
-- would reject them).
INSERT INTO "WikiPageCitizenMention" ("id", "pageId", "citizenId", "createdAt", "suppressedAt")
SELECT
    gen_random_uuid()::text,
    "mentions"."pageId",
    "mentions"."citizenId",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT
        "wp"."id" AS "pageId",
        ("node" -> 'attrs' ->> 'citizenId') AS "citizenId"
    FROM "WikiPage" "wp",
        LATERAL jsonb_path_query("wp"."content", '$.** ? (@.type == "wikiCitizenMention")') AS "node"
    WHERE "wp"."content" IS NOT NULL
) AS "mentions"
WHERE "mentions"."citizenId" IS NOT NULL
    AND EXISTS (SELECT 1 FROM "Entity" "e" WHERE "e"."id" = "mentions"."citizenId");
