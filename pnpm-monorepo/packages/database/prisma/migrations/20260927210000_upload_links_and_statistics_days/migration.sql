-- Link tables for the uploads that wiki pages and snapshots use, instead of
-- a text search in all content. The upload author is a citizen. The two
-- count tables get the day that they count as a key.

-- CreateEnum
CREATE TYPE "WikiPageUploadKind" AS ENUM ('IMAGE', 'ATTACHMENT');

-- CreateTable
CREATE TABLE "WikiPageUpload" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "kind" "WikiPageUploadKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WikiPageUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WikiPageSnapshotUpload" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WikiPageSnapshotUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WikiPageUpload_uploadId_idx" ON "WikiPageUpload"("uploadId");

-- CreateIndex
CREATE UNIQUE INDEX "WikiPageUpload_pageId_uploadId_kind_key" ON "WikiPageUpload"("pageId", "uploadId", "kind");

-- CreateIndex
CREATE INDEX "WikiPageSnapshotUpload_uploadId_idx" ON "WikiPageSnapshotUpload"("uploadId");

-- CreateIndex
CREATE UNIQUE INDEX "WikiPageSnapshotUpload_snapshotId_uploadId_key" ON "WikiPageSnapshotUpload"("snapshotId", "uploadId");

-- AddForeignKey
ALTER TABLE "WikiPageUpload" ADD CONSTRAINT "WikiPageUpload_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageUpload" ADD CONSTRAINT "WikiPageUpload_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageSnapshotUpload" ADD CONSTRAINT "WikiPageSnapshotUpload_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "WikiPageSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageSnapshotUpload" ADD CONSTRAINT "WikiPageSnapshotUpload_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill from the content, with the same rules as the editor: an
-- attachment card has the upload id, an image has the upload id as the last
-- path segment of its src. Only ids of existing uploads count, thus an
-- external image gets no link.
INSERT INTO "WikiPageUpload" ("id", "pageId", "uploadId", "kind")
SELECT gen_random_uuid()::text, "reference"."pageId", "reference"."uploadId", "reference"."kind"::"WikiPageUploadKind"
FROM (
  SELECT DISTINCT "page"."id" AS "pageId", "upload"."id" AS "uploadId", 'ATTACHMENT' AS "kind"
  FROM "WikiPage" AS "page",
    jsonb_path_query("page"."content", 'strict $.** ? (@.type == "wikiAttachment").attrs.uploadId') AS "value"
  JOIN "Upload" AS "upload" ON "upload"."id" = "value" #>> '{}'
  UNION
  SELECT DISTINCT "page"."id", "upload"."id", 'IMAGE'
  FROM "WikiPage" AS "page",
    jsonb_path_query("page"."content", 'strict $.** ? (@.type == "image" || @.type == "wikiFloatImage").attrs.src') AS "value"
  JOIN "Upload" AS "upload" ON "upload"."id" = regexp_replace("value" #>> '{}', '^.*/', '')
) AS "reference";

INSERT INTO "WikiPageSnapshotUpload" ("id", "snapshotId", "uploadId")
SELECT gen_random_uuid()::text, "reference"."snapshotId", "reference"."uploadId"
FROM (
  SELECT "snapshot"."id" AS "snapshotId", "upload"."id" AS "uploadId"
  FROM "WikiPageSnapshot" AS "snapshot",
    jsonb_path_query("snapshot"."content", 'strict $.** ? (@.type == "wikiAttachment").attrs.uploadId') AS "value"
  JOIN "Upload" AS "upload" ON "upload"."id" = "value" #>> '{}'
  UNION
  SELECT "snapshot"."id", "upload"."id"
  FROM "WikiPageSnapshot" AS "snapshot",
    jsonb_path_query("snapshot"."content", 'strict $.** ? (@.type == "image" || @.type == "wikiFloatImage").attrs.src') AS "value"
  JOIN "Upload" AS "upload" ON "upload"."id" = regexp_replace("value" #>> '{}', '^.*/', '')
) AS "reference";

-- The old link table: each of its links is in the content (checked on the
-- local copy), thus the backfill above has all of them
ALTER TABLE "_attachments" DROP CONSTRAINT "_attachments_A_fkey";

ALTER TABLE "_attachments" DROP CONSTRAINT "_attachments_B_fkey";

DROP TABLE "_attachments";

-- Upload author: from the user to the citizen of the user. A user without a
-- citizen gives no author.
ALTER TABLE "Upload" DROP CONSTRAINT "Upload_createdById_fkey";

UPDATE "Upload" AS "upload"
SET "createdById" = "citizen"."id"
FROM "Citizen" AS "citizen"
WHERE "citizen"."userId" = "upload"."createdById";

UPDATE "Upload"
SET "createdById" = NULL
WHERE "createdById" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Citizen" WHERE "Citizen"."id" = "Upload"."createdById");

ALTER TABLE "Upload" ADD CONSTRAINT "Upload_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Statistics: the midnight job writes the count of a day after its end
-- (00:00 Europe/Berlin), thus the day is the Berlin date 12 hours before
ALTER TABLE "RoleCitizenCount" ADD COLUMN "day" DATE;

UPDATE "RoleCitizenCount"
SET "day" = (("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin') - INTERVAL '12 hours')::date;

ALTER TABLE "RoleCitizenCount" ALTER COLUMN "day" SET NOT NULL;

ALTER TABLE "VariantShipCount" ADD COLUMN "day" DATE;

UPDATE "VariantShipCount"
SET "day" = (("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin') - INTERVAL '12 hours')::date;

ALTER TABLE "VariantShipCount" ALTER COLUMN "day" SET NOT NULL;

-- DropIndex
DROP INDEX "RoleCitizenCount_createdAt_idx";

-- DropIndex
DROP INDEX "RoleCitizenCount_roleId_createdAt_idx";

-- DropIndex
DROP INDEX "RoleCitizenCount_roleId_idx";

-- DropIndex
DROP INDEX "VariantShipCount_createdAt_idx";

-- DropIndex
DROP INDEX "VariantShipCount_variantId_createdAt_idx";

-- DropIndex
DROP INDEX "VariantShipCount_variantId_idx";

-- The unique index on "date" covers the first; nothing reads the second
DROP INDEX "DailyLoginCount_createdAt_idx";

DROP INDEX "DailyLoginCount_date_idx";

-- CreateIndex
CREATE INDEX "RoleCitizenCount_day_idx" ON "RoleCitizenCount"("day");

-- CreateIndex
CREATE UNIQUE INDEX "RoleCitizenCount_roleId_day_key" ON "RoleCitizenCount"("roleId", "day");

-- CreateIndex
CREATE INDEX "VariantShipCount_day_idx" ON "VariantShipCount"("day");

-- CreateIndex
CREATE UNIQUE INDEX "VariantShipCount_variantId_day_key" ON "VariantShipCount"("variantId", "day");
