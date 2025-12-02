-- CreateEnum
CREATE TYPE "StatisticType" AS ENUM ('SHIP_COUNT');

-- CreateTable
CREATE TABLE "Statistic" (
    "id" TEXT NOT NULL,
    "type" "StatisticType" NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Statistic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Statistic_type_idx" ON "Statistic"("type");

-- CreateIndex
CREATE INDEX "Statistic_createdAt_idx" ON "Statistic"("createdAt");
