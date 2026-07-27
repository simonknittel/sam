-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "thumbnailId" TEXT;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_thumbnailId_fkey" FOREIGN KEY ("thumbnailId") REFERENCES "Upload"("id") ON DELETE SET NULL ON UPDATE CASCADE;
