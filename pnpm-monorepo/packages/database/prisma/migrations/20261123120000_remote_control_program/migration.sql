-- The tables of the relay of the Remote Control Program and the context
-- columns of "LogAnalyzerEntry" (rollout A of step 2). Only new types, new
-- tables and new nullable columns, thus the app of the previous release
-- works with this schema.

-- CreateEnum
CREATE TYPE "ShareGrantGranteeKind" AS ENUM ('citizen', 'role', 'everyone');

-- CreateEnum
CREATE TYPE "RemoteControlProgramRuntimeKind" AS ENUM ('browser');

-- AlterTable
ALTER TABLE "LogAnalyzerEntry" ADD COLUMN     "capabilityVersion" INTEGER,
ADD COLUMN     "connectorVersion" INTEGER,
ADD COLUMN     "runtimeId" UUID;

-- CreateTable
CREATE TABLE "ShareGrant" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "granteeKind" "ShareGrantGranteeKind" NOT NULL,
    "granteeCitizenId" TEXT,
    "granteeRoleId" TEXT,
    "capabilityIds" TEXT[],
    "operations" TEXT[],
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "revokedById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ShareGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RemoteControlProgramRuntime" (
    "id" TEXT NOT NULL,
    "runtimeId" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "kind" "RemoteControlProgramRuntimeKind" NOT NULL,
    "runtimeVersion" TEXT NOT NULL,
    "protocolVersion" INTEGER NOT NULL,
    "announcement" JSONB,
    "connectedAt" TIMESTAMPTZ(3) NOT NULL,
    "leaseExpiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RemoteControlProgramRuntime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RemoteControlProgramWatchLease" (
    "id" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "capabilityId" TEXT NOT NULL,
    "ownerIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RemoteControlProgramWatchLease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RemoteControlProgramOwnerStop" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "stoppedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RemoteControlProgramOwnerStop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShareGrant_ownerId_revokedAt_endsAt_idx" ON "ShareGrant"("ownerId", "revokedAt", "endsAt");

-- CreateIndex
CREATE INDEX "ShareGrant_granteeCitizenId_revokedAt_endsAt_idx" ON "ShareGrant"("granteeCitizenId", "revokedAt", "endsAt");

-- CreateIndex
CREATE INDEX "ShareGrant_granteeRoleId_revokedAt_endsAt_idx" ON "ShareGrant"("granteeRoleId", "revokedAt", "endsAt");

-- CreateIndex
CREATE INDEX "ShareGrant_granteeKind_revokedAt_endsAt_idx" ON "ShareGrant"("granteeKind", "revokedAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "RemoteControlProgramRuntime_ownerId_runtimeId_key" ON "RemoteControlProgramRuntime"("ownerId", "runtimeId");

-- CreateIndex
CREATE INDEX "RemoteControlProgramWatchLease_capabilityId_expiresAt_idx" ON "RemoteControlProgramWatchLease"("capabilityId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RemoteControlProgramWatchLease_viewerId_capabilityId_key" ON "RemoteControlProgramWatchLease"("viewerId", "capabilityId");

-- CreateIndex
CREATE UNIQUE INDEX "RemoteControlProgramOwnerStop_ownerId_key" ON "RemoteControlProgramOwnerStop"("ownerId");

-- AddForeignKey
ALTER TABLE "ShareGrant" ADD CONSTRAINT "ShareGrant_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareGrant" ADD CONSTRAINT "ShareGrant_granteeCitizenId_fkey" FOREIGN KEY ("granteeCitizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareGrant" ADD CONSTRAINT "ShareGrant_granteeRoleId_fkey" FOREIGN KEY ("granteeRoleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareGrant" ADD CONSTRAINT "ShareGrant_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemoteControlProgramRuntime" ADD CONSTRAINT "RemoteControlProgramRuntime_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemoteControlProgramWatchLease" ADD CONSTRAINT "RemoteControlProgramWatchLease_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemoteControlProgramOwnerStop" ADD CONSTRAINT "RemoteControlProgramOwnerStop_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The grantee kind decides which grantee column is set. Thus a grant to a
-- citizen or a role cannot lose its grantee and give access to somebody
-- else: the deletion of the grantee deletes the grant (ON DELETE CASCADE).
ALTER TABLE "ShareGrant" ADD CONSTRAINT "ShareGrant_grantee_check" CHECK (
  ("granteeKind" = 'citizen' AND "granteeCitizenId" IS NOT NULL AND "granteeRoleId" IS NULL)
  OR ("granteeKind" = 'role' AND "granteeRoleId" IS NOT NULL AND "granteeCitizenId" IS NULL)
  OR ("granteeKind" = 'everyone' AND "granteeCitizenId" IS NULL AND "granteeRoleId" IS NULL)
);

-- A grant is valid from its start until before its end
ALTER TABLE "ShareGrant" ADD CONSTRAINT "ShareGrant_validity_check" CHECK (
  "endsAt" IS NULL OR "endsAt" > "startsAt"
);

-- CreateIndex
CREATE INDEX "LogAnalyzerEntry_createdById_eventAt_idx" ON "LogAnalyzerEntry"("createdById", "eventAt");
