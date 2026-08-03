-- Child pages may only narrow read access from now on, which makes PUBLIC on
-- a child page mean exactly what INHERIT means. Semantically identical either
-- way — both resolve to "everyone who may read the parent".
UPDATE "WikiPage"
SET "visibility" = 'INHERIT'
WHERE "parentId" IS NOT NULL AND "visibility" = 'PUBLIC';

-- Manage access is purely additive along the hierarchy now: a page is managed
-- by its ADMIN roles in WikiPageRoleAccess plus everyone managing one of its
-- ancestors. That made INHERIT and RESTRICTED synonyms, so the tier loses its
-- enum. The existing ADMIN role rows keep working and start applying to the
-- whole subtree instead of cutting the ancestors off.

-- AlterTable
ALTER TABLE "WikiPage" DROP COLUMN "adminability";

-- DropEnum
DROP TYPE "WikiPageAdminability";
