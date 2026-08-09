-- CreateTable
CREATE TABLE "OnSiteNotification" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "payloadVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "OnSiteNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OnSiteNotification_citizenId_archivedAt_createdAt_idx" ON "OnSiteNotification"("citizenId", "archivedAt", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "OnSiteNotification" ADD CONSTRAINT "OnSiteNotification_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
