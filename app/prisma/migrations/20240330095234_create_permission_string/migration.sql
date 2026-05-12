-- CreateEnum
CREATE TYPE "OrganizationMembershipType" AS ENUM ('MAIN', 'AFFILIATE', 'LEFT');

-- CreateEnum
CREATE TYPE "OrganizationMembershipVisibility" AS ENUM ('PUBLIC', 'REDACTED');

-- CreateEnum
CREATE TYPE "ConfirmationStatus" AS ENUM ('CONFIRMED', 'FALSE_REPORT');

-- CreateTable
CREATE TABLE "PermissionString" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionString" TEXT NOT NULL,

    CONSTRAINT "PermissionString_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "spectrumId" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationAttributeHistoryEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "attributeKey" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "confirmed" "ConfirmationStatus",
    "confirmedAt" TIMESTAMP(3),
    "confirmedById" TEXT,

    CONSTRAINT "OrganizationAttributeHistoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActiveOrganizationMembership" (
    "organizationId" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "type" "OrganizationMembershipType" NOT NULL,
    "visibility" "OrganizationMembershipVisibility" NOT NULL,

    CONSTRAINT "ActiveOrganizationMembership_pkey" PRIMARY KEY ("organizationId","citizenId")
);

-- CreateTable
CREATE TABLE "OrganizationMembershipHistoryEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "type" "OrganizationMembershipType" NOT NULL,
    "visibility" "OrganizationMembershipVisibility" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "confirmed" "ConfirmationStatus",
    "confirmedAt" TIMESTAMP(3),
    "confirmedById" TEXT,

    CONSTRAINT "OrganizationMembershipHistoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_spectrumId_key" ON "Organization"("spectrumId");

-- CreateIndex
CREATE INDEX "OrganizationAttributeHistoryEntry_organizationId_idx" ON "OrganizationAttributeHistoryEntry"("organizationId");

-- CreateIndex
CREATE INDEX "ActiveOrganizationMembership_organizationId_idx" ON "ActiveOrganizationMembership"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationMembershipHistoryEntry_organizationId_idx" ON "OrganizationMembershipHistoryEntry"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationMembershipHistoryEntry_citizenId_idx" ON "OrganizationMembershipHistoryEntry"("citizenId");

-- AddForeignKey
ALTER TABLE "PermissionString" ADD CONSTRAINT "PermissionString_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationAttributeHistoryEntry" ADD CONSTRAINT "OrganizationAttributeHistoryEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationAttributeHistoryEntry" ADD CONSTRAINT "OrganizationAttributeHistoryEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationAttributeHistoryEntry" ADD CONSTRAINT "OrganizationAttributeHistoryEntry_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveOrganizationMembership" ADD CONSTRAINT "ActiveOrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveOrganizationMembership" ADD CONSTRAINT "ActiveOrganizationMembership_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembershipHistoryEntry" ADD CONSTRAINT "OrganizationMembershipHistoryEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembershipHistoryEntry" ADD CONSTRAINT "OrganizationMembershipHistoryEntry_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembershipHistoryEntry" ADD CONSTRAINT "OrganizationMembershipHistoryEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembershipHistoryEntry" ADD CONSTRAINT "OrganizationMembershipHistoryEntry_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
