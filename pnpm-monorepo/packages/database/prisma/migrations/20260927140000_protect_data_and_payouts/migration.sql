-- Actor columns ("created by", "confirmed by", ...) no longer delete the rows
-- of other people when their actor is deleted: they are nullable and use
-- ON DELETE SET NULL. Only columns that name the owner of a row cascade.
--
-- The SILC ledger gets source columns for automatic bookings. The partial
-- unique indexes make the salary payout and the collection booking of a
-- profit cycle idempotent.
--
-- Permission strings become unique for each role and must match the format
-- that the app parses. Existing duplicates are removed first.
--
-- The daily login counts were stored one day early. They move one day later.

-- DropForeignKey
ALTER TABLE "Entity" DROP CONSTRAINT "Entity_createdById_fkey";

-- DropForeignKey
ALTER TABLE "EntityLog" DROP CONSTRAINT "EntityLog_submittedById_fkey";

-- DropForeignKey
ALTER TABLE "EntityLogAttribute" DROP CONSTRAINT "EntityLogAttribute_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Organization" DROP CONSTRAINT "Organization_createdById_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationAttributeHistoryEntry" DROP CONSTRAINT "OrganizationAttributeHistoryEntry_confirmedById_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationAttributeHistoryEntry" DROP CONSTRAINT "OrganizationAttributeHistoryEntry_createdById_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationMembershipHistoryEntry" DROP CONSTRAINT "OrganizationMembershipHistoryEntry_confirmedById_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationMembershipHistoryEntry" DROP CONSTRAINT "OrganizationMembershipHistoryEntry_createdById_fkey";

-- DropForeignKey
ALTER TABLE "PenaltyEntry" DROP CONSTRAINT "PenaltyEntry_citizenId_fkey";

-- DropForeignKey
ALTER TABLE "PenaltyEntry" DROP CONSTRAINT "PenaltyEntry_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Upload" DROP CONSTRAINT "Upload_createdById_fkey";

-- DropForeignKey
ALTER TABLE "VariantExternalLink" DROP CONSTRAINT "VariantExternalLink_createdById_fkey";

-- DropForeignKey
ALTER TABLE "VariantExternalLink" DROP CONSTRAINT "VariantExternalLink_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "VariantTag" DROP CONSTRAINT "VariantTag_createdById_fkey";

-- AlterTable
ALTER TABLE "Entity" ALTER COLUMN "createdById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Organization" ALTER COLUMN "createdById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "OrganizationAttributeHistoryEntry" ALTER COLUMN "createdById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "OrganizationMembershipHistoryEntry" ALTER COLUMN "createdById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PenaltyEntry" ALTER COLUMN "createdById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SilcTransaction" ADD COLUMN     "profitDistributionCycleId" TEXT,
ADD COLUMN     "salaryDate" DATE,
ADD COLUMN     "salaryRoleId" TEXT,
ADD COLUMN     "taskId" TEXT;

-- AlterTable
ALTER TABLE "Upload" ALTER COLUMN "createdById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "VariantExternalLink" ALTER COLUMN "createdById" DROP NOT NULL,
ALTER COLUMN "updatedById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "VariantTag" ALTER COLUMN "createdById" DROP NOT NULL;

-- Keep one row of each duplicate (roleId, permissionString) pair
DELETE FROM "PermissionString" AS "duplicate"
USING "PermissionString" AS "kept"
WHERE "duplicate"."roleId" = "kept"."roleId"
  AND "duplicate"."permissionString" = "kept"."permissionString"
  AND "duplicate"."id" > "kept"."id";

-- CreateIndex
CREATE UNIQUE INDEX "PermissionString_roleId_permissionString_key" ON "PermissionString"("roleId", "permissionString");

-- The format that transformPermissionStringToPermissionSet parses:
-- resource;operation followed by any number of ;key=value pairs
ALTER TABLE "PermissionString" ADD CONSTRAINT "PermissionString_format_check"
  CHECK ("permissionString" ~ '^[A-Za-z0-9_-]+;[A-Za-z0-9_-]+(;[A-Za-z0-9_-]+=[A-Za-z0-9_*-]+)*$');

-- CreateIndex
CREATE UNIQUE INDEX "SilcTransaction_salary_key" ON "SilcTransaction"("receiverId", "salaryRoleId", "salaryDate") WHERE ("deletedAt" IS NULL AND "salaryDate" IS NOT NULL);

-- CreateIndex
CREATE UNIQUE INDEX "SilcTransaction_profitDistributionCycle_key" ON "SilcTransaction"("receiverId", "profitDistributionCycleId") WHERE ("deletedAt" IS NULL AND "profitDistributionCycleId" IS NOT NULL);

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityLog" ADD CONSTRAINT "EntityLog_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityLogAttribute" ADD CONSTRAINT "EntityLogAttribute_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantExternalLink" ADD CONSTRAINT "VariantExternalLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantExternalLink" ADD CONSTRAINT "VariantExternalLink_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantTag" ADD CONSTRAINT "VariantTag_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationAttributeHistoryEntry" ADD CONSTRAINT "OrganizationAttributeHistoryEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationAttributeHistoryEntry" ADD CONSTRAINT "OrganizationAttributeHistoryEntry_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembershipHistoryEntry" ADD CONSTRAINT "OrganizationMembershipHistoryEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembershipHistoryEntry" ADD CONSTRAINT "OrganizationMembershipHistoryEntry_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenaltyEntry" ADD CONSTRAINT "PenaltyEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenaltyEntry" ADD CONSTRAINT "PenaltyEntry_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SilcTransaction" ADD CONSTRAINT "SilcTransaction_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SilcTransaction" ADD CONSTRAINT "SilcTransaction_profitDistributionCycleId_fkey" FOREIGN KEY ("profitDistributionCycleId") REFERENCES "ProfitDistributionCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SilcTransaction" ADD CONSTRAINT "SilcTransaction_salaryRoleId_fkey" FOREIGN KEY ("salaryRoleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The job counts the previous day in Europe/Berlin, but it stored the UTC
-- date of local midnight, which is one day earlier. The unique index checks
-- each row at once, thus it is out of the way while all rows move.
DROP INDEX "DailyLoginCount_date_key";
UPDATE "DailyLoginCount" SET "date" = "date" + 1;
CREATE UNIQUE INDEX "DailyLoginCount_date_key" ON "DailyLoginCount"("date");
