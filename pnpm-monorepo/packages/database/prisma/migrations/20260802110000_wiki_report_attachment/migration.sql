-- Reports may target a file attachment on a page. The upload reference is
-- severed when the upload is deleted; the file name snapshot keeps the
-- report meaningful afterwards.

-- AlterTable
ALTER TABLE "WikiPageReport" ADD COLUMN     "uploadId" TEXT,
ADD COLUMN     "uploadFileName" TEXT;

-- CreateIndex
CREATE INDEX "WikiPageReport_uploadId_idx" ON "WikiPageReport"("uploadId");

-- AddForeignKey
ALTER TABLE "WikiPageReport" ADD CONSTRAINT "WikiPageReport_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE SET NULL ON UPDATE CASCADE;
