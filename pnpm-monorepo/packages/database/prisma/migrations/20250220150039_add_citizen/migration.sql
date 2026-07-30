-- AlterTable
ALTER TABLE "EventPosition" ADD COLUMN     "citizenId" TEXT;

-- AddForeignKey
ALTER TABLE "EventPosition" ADD CONSTRAINT "EventPosition_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
