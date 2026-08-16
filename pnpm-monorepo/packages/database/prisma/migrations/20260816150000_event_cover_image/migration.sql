-- AlterTable
ALTER TABLE "Event" ADD COLUMN "coverImageId" TEXT;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_coverImageId_fkey" FOREIGN KEY ("coverImageId") REFERENCES "Upload"("id") ON DELETE SET NULL ON UPDATE CASCADE;
