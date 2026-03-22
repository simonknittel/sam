-- AlterTable
ALTER TABLE "AuditEvent" ADD COLUMN     "createdById" TEXT;

-- CreateIndex
CREATE INDEX "AuditEvent_createdById_idx" ON "AuditEvent"("createdById");

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
