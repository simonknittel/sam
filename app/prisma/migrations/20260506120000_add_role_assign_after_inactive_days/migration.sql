-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "assignAfterInactiveDays" INTEGER;

-- CreateIndex
CREATE INDEX "Role_assignAfterInactiveDays_idx" ON "Role"("assignAfterInactiveDays");
