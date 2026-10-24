-- CreateTable
CREATE TABLE "ManualNotification" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "ManualNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualNotificationCitizen" (
    "id" TEXT NOT NULL,
    "manualNotificationId" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,

    CONSTRAINT "ManualNotificationCitizen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualNotificationRole" (
    "id" TEXT NOT NULL,
    "manualNotificationId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "ManualNotificationRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManualNotification_createdAt_id_idx" ON "ManualNotification"("createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "ManualNotificationCitizen_citizenId_idx" ON "ManualNotificationCitizen"("citizenId");

-- CreateIndex
CREATE UNIQUE INDEX "ManualNotificationCitizen_manualNotificationId_citizenId_key" ON "ManualNotificationCitizen"("manualNotificationId", "citizenId");

-- CreateIndex
CREATE INDEX "ManualNotificationRole_roleId_idx" ON "ManualNotificationRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "ManualNotificationRole_manualNotificationId_roleId_key" ON "ManualNotificationRole"("manualNotificationId", "roleId");

-- AddForeignKey
ALTER TABLE "ManualNotification" ADD CONSTRAINT "ManualNotification_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualNotificationCitizen" ADD CONSTRAINT "ManualNotificationCitizen_manualNotificationId_fkey" FOREIGN KEY ("manualNotificationId") REFERENCES "ManualNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualNotificationCitizen" ADD CONSTRAINT "ManualNotificationCitizen_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualNotificationRole" ADD CONSTRAINT "ManualNotificationRole_manualNotificationId_fkey" FOREIGN KEY ("manualNotificationId") REFERENCES "ManualNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualNotificationRole" ADD CONSTRAINT "ManualNotificationRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
