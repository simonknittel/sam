-- AlterTable
ALTER TABLE "EventPosition" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "parentPositionId" TEXT;

-- AddForeignKey
ALTER TABLE "EventPosition" ADD CONSTRAINT "EventPosition_parentPositionId_fkey" FOREIGN KEY ("parentPositionId") REFERENCES "EventPosition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
