-- AlterTable
ALTER TABLE "ProfitDistributionCycle"
ADD COLUMN "collectionEndedByAutomation" TIMESTAMP(3),
ADD COLUMN "payoutEndedByAutomation" TIMESTAMP(3);
