-- CreateTable
CREATE TABLE "LogAnalyzerPattern" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "regExp" TEXT NOT NULL,
    "messageTemplate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "updatedAt" TIMESTAMP(3),
    "updatedById" TEXT,
    "disabledAt" TIMESTAMP(3),
    "disabledById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "LogAnalyzerPattern_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LogAnalyzerPattern_disabledAt_idx" ON "LogAnalyzerPattern"("disabledAt");

-- CreateIndex
CREATE INDEX "LogAnalyzerPattern_deletedAt_idx" ON "LogAnalyzerPattern"("deletedAt");

-- AddForeignKey
ALTER TABLE "LogAnalyzerPattern" ADD CONSTRAINT "LogAnalyzerPattern_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAnalyzerPattern" ADD CONSTRAINT "LogAnalyzerPattern_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAnalyzerPattern" ADD CONSTRAINT "LogAnalyzerPattern_disabledById_fkey" FOREIGN KEY ("disabledById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAnalyzerPattern" ADD CONSTRAINT "LogAnalyzerPattern_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
