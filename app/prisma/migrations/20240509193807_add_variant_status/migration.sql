/*
  Warnings:

  - You are about to drop the column `image` on the `Manufacturer` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `Series` table. All the data in the column will be lost.
  - You are about to drop the column `ammunitionStatus` on the `Ship` table. All the data in the column will be lost.
  - You are about to drop the column `hullStatus` on the `Ship` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `Variant` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "VariantStatus" AS ENUM ('FLIGHT_READY', 'NOT_FLIGHT_READY');

-- AlterTable
ALTER TABLE "Manufacturer" DROP COLUMN "image",
ADD COLUMN     "imageId" TEXT;

-- AlterTable
ALTER TABLE "Series" DROP COLUMN "image";

-- AlterTable
ALTER TABLE "Ship" DROP COLUMN "ammunitionStatus",
DROP COLUMN "hullStatus";

-- AlterTable
ALTER TABLE "Variant" DROP COLUMN "image",
ADD COLUMN     "status" "VariantStatus";

-- AddForeignKey
ALTER TABLE "Manufacturer" ADD CONSTRAINT "Manufacturer_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Upload"("id") ON DELETE SET NULL ON UPDATE CASCADE;
