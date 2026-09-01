-- CreateTable
CREATE TABLE "LogAnalyzerEntry" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "rawLine" TEXT NOT NULL,
    "eventAt" TIMESTAMP(3) NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "LogAnalyzerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LogAnalyzerEntry_eventAt_idx" ON "LogAnalyzerEntry"("eventAt");

-- CreateIndex
CREATE INDEX "LogAnalyzerEntry_createdAt_idx" ON "LogAnalyzerEntry"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LogAnalyzerEntry_createdById_hash_key" ON "LogAnalyzerEntry"("createdById", "hash");

-- AddForeignKey
ALTER TABLE "LogAnalyzerEntry" ADD CONSTRAINT "LogAnalyzerEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
