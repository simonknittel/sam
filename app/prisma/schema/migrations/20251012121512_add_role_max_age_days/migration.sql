-- AlterTable
ALTER TABLE "EntityLog" ALTER COLUMN "submittedById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "EntityLogAttribute" ALTER COLUMN "createdById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "maxAgeDays" INTEGER;

-- CreateIndex
CREATE INDEX "Entity_roles_idx" ON "Entity"("roles");

-- CreateIndex
CREATE INDEX "Role_maxAgeDays_idx" ON "Role"("maxAgeDays");
