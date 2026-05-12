-- DropTable
DROP TABLE "Statistic";

-- DropEnum
DROP TYPE "StatisticType";

-- CreateTable
CREATE TABLE "VariantShipCount" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VariantShipCount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VariantShipCount_variantId_idx" ON "VariantShipCount"("variantId");

-- CreateIndex
CREATE INDEX "VariantShipCount_createdAt_idx" ON "VariantShipCount"("createdAt");

-- CreateIndex
CREATE INDEX "VariantShipCount_variantId_createdAt_idx" ON "VariantShipCount"("variantId", "createdAt");

-- AddForeignKey
ALTER TABLE "VariantShipCount" ADD CONSTRAINT "VariantShipCount_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
