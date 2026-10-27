-- CreateTable
CREATE TABLE "RoleTag" (
    "id" TEXT NOT NULL,
    "name" CITEXT NOT NULL,
    "description" TEXT,
    "iconId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "RoleTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleTagAssignment" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "RoleTagAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoleTag_name_key" ON "RoleTag"("name");

-- CreateIndex
CREATE INDEX "RoleTagAssignment_tagId_idx" ON "RoleTagAssignment"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleTagAssignment_roleId_tagId_key" ON "RoleTagAssignment"("roleId", "tagId");

-- AddForeignKey
ALTER TABLE "RoleTag" ADD CONSTRAINT "RoleTag_iconId_fkey" FOREIGN KEY ("iconId") REFERENCES "Upload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleTag" ADD CONSTRAINT "RoleTag_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleTag" ADD CONSTRAINT "RoleTag_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleTagAssignment" ADD CONSTRAINT "RoleTagAssignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleTagAssignment" ADD CONSTRAINT "RoleTagAssignment_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "RoleTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleTagAssignment" ADD CONSTRAINT "RoleTagAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;
