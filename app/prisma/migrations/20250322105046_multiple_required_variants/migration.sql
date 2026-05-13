-- DropForeignKey
ALTER TABLE "EventPosition" DROP CONSTRAINT "EventPosition_requiredVariantId_fkey";

-- CreateTable
CREATE TABLE "EventPositionRequiredVariant" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 99999,

    CONSTRAINT "EventPositionRequiredVariant_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EventPositionRequiredVariant" ADD CONSTRAINT "EventPositionRequiredVariant_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "EventPosition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPositionRequiredVariant" ADD CONSTRAINT "EventPositionRequiredVariant_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
