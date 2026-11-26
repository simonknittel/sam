-- A grant of the grantee kind "role" can have more than one role. The roles
-- move from the column "granteeRoleId" to the table "ShareGrantGranteeRole".

-- CreateTable
CREATE TABLE "ShareGrantGranteeRole" (
    "id" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareGrantGranteeRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShareGrantGranteeRole_roleId_idx" ON "ShareGrantGranteeRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "ShareGrantGranteeRole_grantId_roleId_key" ON "ShareGrantGranteeRole"("grantId", "roleId");

-- AddForeignKey
ALTER TABLE "ShareGrantGranteeRole" ADD CONSTRAINT "ShareGrantGranteeRole_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "ShareGrant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareGrantGranteeRole" ADD CONSTRAINT "ShareGrantGranteeRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Each grant had one role, thus the id of the grant is a unique id for the new row
INSERT INTO "ShareGrantGranteeRole" ("id", "grantId", "roleId", "createdAt")
SELECT "id", "id", "granteeRoleId", "createdAt"
FROM "ShareGrant"
WHERE "granteeRoleId" IS NOT NULL;

-- The constraint names the dropped column. The new constraint is below.
ALTER TABLE "ShareGrant" DROP CONSTRAINT "ShareGrant_grantee_check";

-- DropForeignKey
ALTER TABLE "ShareGrant" DROP CONSTRAINT "ShareGrant_granteeRoleId_fkey";

-- DropIndex
DROP INDEX "ShareGrant_granteeRoleId_revokedAt_endsAt_idx";

-- AlterTable
ALTER TABLE "ShareGrant" DROP COLUMN "granteeRoleId";

-- A grant to a citizen cannot lose its grantee and give access to somebody
-- else: the deletion of the citizen deletes the grant (ON DELETE CASCADE).
ALTER TABLE "ShareGrant" ADD CONSTRAINT "ShareGrant_grantee_check" CHECK (
  ("granteeKind" = 'citizen') = ("granteeCitizenId" IS NOT NULL)
);
