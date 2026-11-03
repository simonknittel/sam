-- CreateEnum
CREATE TYPE "EventPositionRoleMatch" AS ENUM ('ANY', 'ALL');

-- AlterTable
ALTER TABLE "EventPosition" ADD COLUMN     "requiredRoleMatch" "EventPositionRoleMatch" NOT NULL DEFAULT 'ANY';

-- CreateTable
CREATE TABLE "EventPositionRequiredRole" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "EventPositionRequiredRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventPositionRequiredRole_roleId_idx" ON "EventPositionRequiredRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "EventPositionRequiredRole_positionId_roleId_key" ON "EventPositionRequiredRole"("positionId", "roleId");

-- AddForeignKey
ALTER TABLE "EventPositionRequiredRole" ADD CONSTRAINT "EventPositionRequiredRole_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "EventPosition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPositionRequiredRole" ADD CONSTRAINT "EventPositionRequiredRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

