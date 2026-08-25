-- CreateEnum
CREATE TYPE "OnboardingTaskCompletionMethod" AS ENUM ('TOUR', 'SKIPPED');

-- CreateTable
CREATE TABLE "OnboardingTaskProgress" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "taskKey" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "completionMethod" "OnboardingTaskCompletionMethod" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingTaskProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingStepProgress" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "taskKey" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingStepProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OnboardingTaskProgress_citizenId_idx" ON "OnboardingTaskProgress"("citizenId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingTaskProgress_citizenId_taskKey_key" ON "OnboardingTaskProgress"("citizenId", "taskKey");

-- CreateIndex
CREATE INDEX "OnboardingStepProgress_citizenId_idx" ON "OnboardingStepProgress"("citizenId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingStepProgress_citizenId_taskKey_stepKey_key" ON "OnboardingStepProgress"("citizenId", "taskKey", "stepKey");

-- AddForeignKey
ALTER TABLE "OnboardingTaskProgress" ADD CONSTRAINT "OnboardingTaskProgress_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingStepProgress" ADD CONSTRAINT "OnboardingStepProgress_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
