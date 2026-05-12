-- CreateEnum
CREATE TYPE "RoleAssignmentLevelChangeType" AS ENUM ('UP', 'DOWN');

-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "inactivityThreshold" INTEGER,
ADD COLUMN     "maxLevel" INTEGER;

-- AlterTable
ALTER TABLE "RoleAssignment" ADD COLUMN     "currentLevel" INTEGER,
ADD COLUMN     "currentLevelUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RoleAssignmentLevelChange" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "type" "RoleAssignmentLevelChangeType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "RoleAssignmentLevelChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoleAssignmentLevelChange_citizenId_idx" ON "RoleAssignmentLevelChange"("citizenId");

-- AddForeignKey
ALTER TABLE "RoleAssignmentLevelChange" ADD CONSTRAINT "RoleAssignmentLevelChange_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignmentLevelChange" ADD CONSTRAINT "RoleAssignmentLevelChange_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignmentLevelChange" ADD CONSTRAINT "RoleAssignmentLevelChange_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
