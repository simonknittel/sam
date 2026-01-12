-- AlterTable
ALTER TABLE "ProfitDistributionCycle"
ALTER COLUMN "auecProfit" TYPE BIGINT USING "auecProfit"::BIGINT;
