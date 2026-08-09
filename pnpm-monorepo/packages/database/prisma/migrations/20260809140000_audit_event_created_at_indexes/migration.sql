-- DropIndex
DROP INDEX "AuditEvent_type_idx";

-- DropIndex
DROP INDEX "AuditEvent_createdById_idx";

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_id_idx" ON "AuditEvent"("createdAt", "id");

-- CreateIndex
CREATE INDEX "AuditEvent_type_createdAt_id_idx" ON "AuditEvent"("type", "createdAt", "id");

-- CreateIndex
CREATE INDEX "AuditEvent_createdById_createdAt_id_idx" ON "AuditEvent"("createdById", "createdAt", "id");
