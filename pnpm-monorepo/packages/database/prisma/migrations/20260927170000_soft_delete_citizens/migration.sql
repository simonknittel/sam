-- Soft delete for citizens. A deleted citizen stays in the table with
-- "deletedAt" set. The Discord ID and the Spectrum ID are unique only among
-- the citizens that are not deleted, so that a person can be added again.

-- DropIndex
DROP INDEX "Citizen_discordId_key";

-- AlterTable
ALTER TABLE "Citizen" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Citizen_discordId_key" ON "Citizen"("discordId") WHERE ("deletedAt" IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "Citizen_spectrumId_key" ON "Citizen"("spectrumId") WHERE ("deletedAt" IS NULL);

-- AddForeignKey
ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

