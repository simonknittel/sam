-- CreateTable
CREATE TABLE "RoleCitizenCount" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleCitizenCount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoleCitizenCount_roleId_idx" ON "RoleCitizenCount"("roleId");

-- CreateIndex
CREATE INDEX "RoleCitizenCount_createdAt_idx" ON "RoleCitizenCount"("createdAt");

-- CreateIndex
CREATE INDEX "RoleCitizenCount_roleId_createdAt_idx" ON "RoleCitizenCount"("roleId", "createdAt");

-- AddForeignKey
ALTER TABLE "RoleCitizenCount" ADD CONSTRAINT "RoleCitizenCount_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
