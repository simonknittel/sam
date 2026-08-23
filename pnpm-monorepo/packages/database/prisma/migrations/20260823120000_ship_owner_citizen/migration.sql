-- Ships and variant tag authors move from User to Entity (Citizen). The app
-- resolved the owner as Citizen -> discordId -> Account -> User on every read;
-- this migration removes that indirection from the data model.
--
-- The mapping rule is Ship."ownerId" (a user id) -> Account."userId" ->
-- Account."providerAccountId" -> Entity."discordId" -> Entity."id". A user
-- with more than one Discord account is theoretical; DISTINCT ON with an
-- explicit account order keeps the choice deterministic.
--
-- Each column is migrated through a temporary column, so an unmappable row is
-- recognizable by a NULL in that column and the original value stays readable
-- until the swap.

-- Ship.owner: User -> Entity

ALTER TABLE "Ship" ADD COLUMN "ownerIdMigration" TEXT;

UPDATE "Ship"
SET "ownerIdMigration" = "mapping"."entityId"
FROM (
    SELECT DISTINCT ON ("Account"."userId")
        "Account"."userId" AS "userId",
        "Entity"."id" AS "entityId"
    FROM "Account"
    INNER JOIN "Entity" ON "Entity"."discordId" = "Account"."providerAccountId"
    ORDER BY "Account"."userId", "Account"."id"
) AS "mapping"
WHERE "mapping"."userId" = "Ship"."ownerId";

-- Ships of a user without a citizen are already invisible in the app: every
-- fleet list resolves its owners through a citizen. The new foreign key to
-- Entity leaves no place to keep them, so they are removed for good.
DELETE FROM "Ship" WHERE "ownerIdMigration" IS NULL;

ALTER TABLE "Ship" DROP CONSTRAINT "Ship_ownerId_fkey";
ALTER TABLE "Ship" DROP COLUMN "ownerId";
ALTER TABLE "Ship" RENAME COLUMN "ownerIdMigration" TO "ownerId";
ALTER TABLE "Ship" ALTER COLUMN "ownerId" SET NOT NULL;

ALTER TABLE "Ship" ADD CONSTRAINT "Ship_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- VariantTag.createdBy and VariantTag.updatedBy: User -> Entity

ALTER TABLE "VariantTag" ADD COLUMN "createdByIdMigration" TEXT;
ALTER TABLE "VariantTag" ADD COLUMN "updatedByIdMigration" TEXT;

UPDATE "VariantTag"
SET
    "createdByIdMigration" = "createdByMapping"."entityId"
FROM (
    SELECT DISTINCT ON ("Account"."userId")
        "Account"."userId" AS "userId",
        "Entity"."id" AS "entityId"
    FROM "Account"
    INNER JOIN "Entity" ON "Entity"."discordId" = "Account"."providerAccountId"
    ORDER BY "Account"."userId", "Account"."id"
) AS "createdByMapping"
WHERE "createdByMapping"."userId" = "VariantTag"."createdById";

UPDATE "VariantTag"
SET
    "updatedByIdMigration" = "updatedByMapping"."entityId"
FROM (
    SELECT DISTINCT ON ("Account"."userId")
        "Account"."userId" AS "userId",
        "Entity"."id" AS "entityId"
    FROM "Account"
    INNER JOIN "Entity" ON "Entity"."discordId" = "Account"."providerAccountId"
    ORDER BY "Account"."userId", "Account"."id"
) AS "updatedByMapping"
WHERE "updatedByMapping"."userId" = "VariantTag"."updatedById";

-- A tag is shared by all variants that carry it, so an unmappable author must
-- not cost the tag itself. Those authors are reassigned to the citizen of the
-- app owner. The two statements touch no row when every author maps, which is
-- the case on the empty test databases; the subquery is then never evaluated.
-- If unmappable rows do exist without that citizen, the NOT NULL below fails
-- and the migration stops instead of inventing an author.
UPDATE "VariantTag"
SET "createdByIdMigration" = (
    SELECT "Entity"."id"
    FROM "Entity"
    INNER JOIN "Account" ON "Account"."providerAccountId" = "Entity"."discordId"
    WHERE "Account"."userId" = 'clhaw95yi0000jr08ybuvy137'
    ORDER BY "Account"."id"
    LIMIT 1
)
WHERE "createdByIdMigration" IS NULL;

UPDATE "VariantTag"
SET "updatedByIdMigration" = (
    SELECT "Entity"."id"
    FROM "Entity"
    INNER JOIN "Account" ON "Account"."providerAccountId" = "Entity"."discordId"
    WHERE "Account"."userId" = 'clhaw95yi0000jr08ybuvy137'
    ORDER BY "Account"."id"
    LIMIT 1
)
WHERE "updatedById" IS NOT NULL AND "updatedByIdMigration" IS NULL;

ALTER TABLE "VariantTag" DROP CONSTRAINT "VariantTag_createdById_fkey";
ALTER TABLE "VariantTag" DROP CONSTRAINT "VariantTag_updatedById_fkey";
ALTER TABLE "VariantTag" DROP COLUMN "createdById";
ALTER TABLE "VariantTag" DROP COLUMN "updatedById";
ALTER TABLE "VariantTag" RENAME COLUMN "createdByIdMigration" TO "createdById";
ALTER TABLE "VariantTag" RENAME COLUMN "updatedByIdMigration" TO "updatedById";
ALTER TABLE "VariantTag" ALTER COLUMN "createdById" SET NOT NULL;

ALTER TABLE "VariantTag" ADD CONSTRAINT "VariantTag_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VariantTag" ADD CONSTRAINT "VariantTag_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
