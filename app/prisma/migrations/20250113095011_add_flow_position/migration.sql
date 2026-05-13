/*
  Warnings:

  - A unique constraint covering the columns `[position]` on the table `Flow` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Flow" ADD COLUMN     "position" SERIAL;

-- CreateIndex
CREATE UNIQUE INDEX "Flow_position_key" ON "Flow"("position");
