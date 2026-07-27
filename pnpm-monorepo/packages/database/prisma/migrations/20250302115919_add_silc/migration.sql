-- AlterTable
ALTER TABLE "Entity" ADD COLUMN     "silcBalance" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SilcTransaction" (
    "id" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "updatedAt" TIMESTAMP(3),
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "SilcTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SilcTransaction_receiverId_idx" ON "SilcTransaction"("receiverId");

-- CreateIndex
CREATE INDEX "PenaltyEntry_citizenId_idx" ON "PenaltyEntry"("citizenId");

-- AddForeignKey
ALTER TABLE "SilcTransaction" ADD CONSTRAINT "SilcTransaction_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SilcTransaction" ADD CONSTRAINT "SilcTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SilcTransaction" ADD CONSTRAINT "SilcTransaction_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SilcTransaction" ADD CONSTRAINT "SilcTransaction_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
