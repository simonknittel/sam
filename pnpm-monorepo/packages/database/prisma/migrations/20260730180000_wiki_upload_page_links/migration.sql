-- Replaces Upload.wikiPageId (one page per upload) with a many-to-many
-- relation, so uploads shared between pages (e.g. by page duplication) can
-- be permission-checked against every page containing them. Existing links
-- are carried over.

-- CreateTable
CREATE TABLE "_attachments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_attachments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_attachments_B_index" ON "_attachments"("B");

-- AddForeignKey
ALTER TABLE "_attachments" ADD CONSTRAINT "_attachments_A_fkey" FOREIGN KEY ("A") REFERENCES "Upload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_attachments" ADD CONSTRAINT "_attachments_B_fkey" FOREIGN KEY ("B") REFERENCES "WikiPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry over the existing single-page links
INSERT INTO "_attachments" ("A", "B")
SELECT "id", "wikiPageId" FROM "Upload" WHERE "wikiPageId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "Upload" DROP CONSTRAINT "Upload_wikiPageId_fkey";

-- DropIndex
DROP INDEX "Upload_wikiPageId_idx";

-- AlterTable
ALTER TABLE "Upload" DROP COLUMN "wikiPageId";
