-- CreateTable
CREATE TABLE "PenaltyEntry" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "citizenId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "PenaltyEntry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PenaltyEntry" ADD CONSTRAINT "PenaltyEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenaltyEntry" ADD CONSTRAINT "PenaltyEntry_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenaltyEntry" ADD CONSTRAINT "PenaltyEntry_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
