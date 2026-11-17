-- CreateEnum
CREATE TYPE "ShipAcquisitionSource" AS ENUM ('STORE', 'IN_GAME');

-- AlterTable
ALTER TABLE "Variant" ADD COLUMN     "storePriceUsdCents" INTEGER;

-- AlterTable
ALTER TABLE "Ship" ADD COLUMN     "acquisitionSource" "ShipAcquisitionSource",
ADD COLUMN     "note" TEXT;

-- CreateTable
CREATE TABLE "DailyFleetValue" (
    "id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "storeValueUsdCents" BIGINT NOT NULL,
    "inGameValueUsdCents" BIGINT NOT NULL,
    "unknownValueUsdCents" BIGINT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyFleetValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyFleetValue_day_key" ON "DailyFleetValue"("day");
