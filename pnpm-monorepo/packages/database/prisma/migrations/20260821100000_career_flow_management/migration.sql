-- Career flows gain a management surface: a stable opaque id with a separate
-- slug for the URL, author/timestamp and soft-delete columns, and per-role
-- access as table rows instead of attribute-scoped permission strings.
--
-- The statement order matters: the grants are copied while the flow ids are
-- still the slug-like values the permission strings name, and only then are
-- the ids regenerated (the foreign keys cascade).

-- CreateEnum
CREATE TYPE "FlowRoleAccessType" AS ENUM ('READ', 'UPDATE');

-- CreateTable
CREATE TABLE "FlowRoleAccess" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "type" "FlowRoleAccessType" NOT NULL,

    CONSTRAINT "FlowRoleAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FlowRoleAccess_roleId_idx" ON "FlowRoleAccess"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "FlowRoleAccess_flowId_roleId_key" ON "FlowRoleAccess"("flowId", "roleId");

-- AddForeignKey
ALTER TABLE "FlowRoleAccess" ADD CONSTRAINT "FlowRoleAccess_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowRoleAccess" ADD CONSTRAINT "FlowRoleAccess_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry the existing per-flow grants over. One row per (flow, role): UPDATE
-- wins over READ because it implies it. A `flowId=*` wildcard grant matches
-- every flow. Grants naming a flow that no longer exists join nothing and
-- disappear with the permission strings below. Ids are UUIDs instead of the
-- client's cuid2 — only uniqueness matters.
INSERT INTO "FlowRoleAccess" ("id", "flowId", "roleId", "type")
SELECT
    gen_random_uuid()::text,
    "grants"."flowId",
    "grants"."roleId",
    CASE
        WHEN bool_or("grants"."isUpdate") THEN 'UPDATE'::"FlowRoleAccessType"
        ELSE 'READ'::"FlowRoleAccessType"
    END
FROM (
    SELECT
        "f"."id" AS "flowId",
        "ps"."roleId" AS "roleId",
        split_part("ps"."permissionString", ';', 2) = 'update' AS "isUpdate"
    FROM "PermissionString" "ps"
        JOIN "Flow" "f" ON split_part("ps"."permissionString", '=', 2) IN ("f"."id", '*')
    WHERE "ps"."permissionString" LIKE 'career;read;flowId=%'
        OR "ps"."permissionString" LIKE 'career;update;flowId=%'
) AS "grants"
GROUP BY "grants"."flowId", "grants"."roleId";

-- AlterTable
ALTER TABLE "Flow" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ADD COLUMN     "updatedById" TEXT;

-- The former id was the URL segment, so it becomes the slug unchanged and
-- every existing link keeps working.
UPDATE "Flow" SET "slug" = "id", "updatedAt" = CURRENT_TIMESTAMP;

ALTER TABLE "Flow" ALTER COLUMN "slug" SET NOT NULL,
ALTER COLUMN "updatedAt" SET NOT NULL;

-- Replace the hand-written ids so no id looks like a slug any more. The
-- foreign keys of FlowNode and FlowRoleAccess cascade on update. UUIDs
-- instead of cuid2 for the same reason as above; ids are opaque, so the
-- mixed shape is cosmetic.
UPDATE "Flow" SET "id" = gen_random_uuid()::text;

-- The old per-flow permission strings are replaced by FlowRoleAccess rows.
-- Leaving them behind would misrepresent a role's access in any later audit,
-- since nothing checks them any more. `career;manage` is the new overarching
-- permission and stays.
DELETE FROM "PermissionString"
WHERE "permissionString" LIKE 'career;%' AND "permissionString" <> 'career;manage';

-- DropIndex
DROP INDEX "Flow_position_key";

-- Positions are renumbered inside one transaction on reorder, which a unique
-- constraint would force through placeholder values, and are assigned
-- explicitly rather than by a sequence.
ALTER TABLE "Flow" ALTER COLUMN "position" DROP DEFAULT;
DROP SEQUENCE "Flow_position_seq";
ALTER TABLE "Flow" ALTER COLUMN "position" SET DEFAULT 0;

-- CreateIndex
CREATE INDEX "Flow_deletedAt_idx" ON "Flow"("deletedAt");

-- Hand-written partial unique index Prisma cannot express: a soft-deleted
-- flow must not keep its slug reserved, so uniqueness only covers the live
-- rows. Restoring therefore has to detect a collision and demand a new slug.
CREATE UNIQUE INDEX "Flow_active_slug_key" ON "Flow"("slug") WHERE "deletedAt" IS NULL;

-- AddForeignKey
ALTER TABLE "Flow" ADD CONSTRAINT "Flow_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flow" ADD CONSTRAINT "Flow_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flow" ADD CONSTRAINT "Flow_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
