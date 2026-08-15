-- AlterTable
ALTER TABLE "Variant" ADD COLUMN     "wikiPageId" TEXT;

-- CreateIndex
CREATE INDEX "Variant_wikiPageId_idx" ON "Variant"("wikiPageId");

-- AddForeignKey
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_wikiPageId_fkey" FOREIGN KEY ("wikiPageId") REFERENCES "WikiPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
