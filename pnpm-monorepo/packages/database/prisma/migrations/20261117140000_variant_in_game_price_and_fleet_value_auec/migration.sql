-- AlterTable
ALTER TABLE "Variant" ADD COLUMN     "inGamePriceAuec" INTEGER;

-- AlterTable
-- No default: the table is still empty. The migration before this one
-- creates it in the same release, and only the midnight job writes rows.
ALTER TABLE "DailyFleetValue" ADD COLUMN     "inGameValueAuec" BIGINT NOT NULL,
ADD COLUMN     "storeValueAuec" BIGINT NOT NULL,
ADD COLUMN     "unknownValueAuec" BIGINT NOT NULL;
