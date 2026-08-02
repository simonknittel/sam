-- CreateEnum
CREATE TYPE "WikiPageUploadability" AS ENUM ('INHERIT', 'EDITORS', 'RESTRICTED');

-- AlterTable
ALTER TABLE "WikiPage" ADD COLUMN     "attachmentUploadability" "WikiPageUploadability" NOT NULL DEFAULT 'INHERIT',
ADD COLUMN     "imageUploadability" "WikiPageUploadability" NOT NULL DEFAULT 'INHERIT';

-- Top-level pages never INHERIT (there is nothing to inherit from) — same
-- invariant as the permission tiers. Semantically identical either way:
-- INHERIT at the root already resolves to RESTRICTED.
UPDATE "WikiPage"
SET "imageUploadability" = 'RESTRICTED', "attachmentUploadability" = 'RESTRICTED'
WHERE "parentId" IS NULL;
