-- CreateTable
CREATE TABLE "DailyLoginCount" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyLoginCount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyLoginCount_date_key" ON "DailyLoginCount"("date");

-- CreateIndex
CREATE INDEX "DailyLoginCount_date_idx" ON "DailyLoginCount"("date");

-- CreateIndex
CREATE INDEX "DailyLoginCount_createdAt_idx" ON "DailyLoginCount"("createdAt");
