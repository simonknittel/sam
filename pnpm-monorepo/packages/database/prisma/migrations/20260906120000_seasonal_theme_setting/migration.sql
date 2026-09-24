-- CreateTable
CREATE TABLE "SeasonalThemeSetting" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "disabledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeasonalThemeSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SeasonalThemeSetting_citizenId_idx" ON "SeasonalThemeSetting"("citizenId");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonalThemeSetting_citizenId_eventKey_key" ON "SeasonalThemeSetting"("citizenId", "eventKey");

-- AddForeignKey
ALTER TABLE "SeasonalThemeSetting" ADD CONSTRAINT "SeasonalThemeSetting_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
