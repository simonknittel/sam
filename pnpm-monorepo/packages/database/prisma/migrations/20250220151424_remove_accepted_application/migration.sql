/*
  Warnings:

  - You are about to drop the column `acceptedApplicationId` on the `EventPosition` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "EventPosition" DROP CONSTRAINT "EventPosition_acceptedApplicationId_fkey";

-- AlterTable
ALTER TABLE "EventPosition" DROP COLUMN "acceptedApplicationId";
