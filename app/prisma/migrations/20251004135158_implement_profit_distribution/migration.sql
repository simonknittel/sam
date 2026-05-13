-- CreateTable
CREATE TABLE "ProfitDistributionCycle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "collectionEndedAt" TIMESTAMP(3) NOT NULL,
    "collectionEndedById" TEXT,
    "payoutStartedAt" TIMESTAMP(3),
    "payoutStartedById" TEXT,
    "payoutEndedAt" TIMESTAMP(3),
    "payoutEndedById" TEXT,
    "auecProfit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "ProfitDistributionCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfitDistributionCycleParticipant" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "silcBalanceSnapshot" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cededAt" TIMESTAMP(3),
    "cededById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "acceptedById" TEXT,
    "disbursedAt" TIMESTAMP(3),
    "disbursedById" TEXT,

    CONSTRAINT "ProfitDistributionCycleParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfitDistributionCycleParticipant_cycleId_citizenId_key" ON "ProfitDistributionCycleParticipant"("cycleId", "citizenId");

-- AddForeignKey
ALTER TABLE "ProfitDistributionCycle" ADD CONSTRAINT "ProfitDistributionCycle_collectionEndedById_fkey" FOREIGN KEY ("collectionEndedById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitDistributionCycle" ADD CONSTRAINT "ProfitDistributionCycle_payoutStartedById_fkey" FOREIGN KEY ("payoutStartedById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitDistributionCycle" ADD CONSTRAINT "ProfitDistributionCycle_payoutEndedById_fkey" FOREIGN KEY ("payoutEndedById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitDistributionCycle" ADD CONSTRAINT "ProfitDistributionCycle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitDistributionCycleParticipant" ADD CONSTRAINT "ProfitDistributionCycleParticipant_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "ProfitDistributionCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitDistributionCycleParticipant" ADD CONSTRAINT "ProfitDistributionCycleParticipant_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitDistributionCycleParticipant" ADD CONSTRAINT "ProfitDistributionCycleParticipant_cededById_fkey" FOREIGN KEY ("cededById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitDistributionCycleParticipant" ADD CONSTRAINT "ProfitDistributionCycleParticipant_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitDistributionCycleParticipant" ADD CONSTRAINT "ProfitDistributionCycleParticipant_disbursedById_fkey" FOREIGN KEY ("disbursedById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
