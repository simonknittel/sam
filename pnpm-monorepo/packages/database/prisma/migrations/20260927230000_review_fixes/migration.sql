-- Fixes of the review of the database redesign: the creator of a citizen is
-- a citizen like the other actor columns, a deleted citizen keeps no login,
-- and the wiki tree check runs only when a page really moves.

-- Citizen creator: from the user to the citizen of the user. A user whose
-- citizen was deleted has no link anymore, thus the Discord account finds
-- that citizen (an active citizen first). A user without a citizen gives no
-- creator.
ALTER TABLE "Citizen" DROP CONSTRAINT "Citizen_createdById_fkey";

UPDATE "Citizen" AS "created"
SET "createdById" = COALESCE(
  (
    SELECT "creator"."id"
    FROM "Citizen" AS "creator"
    WHERE "creator"."userId" = "created"."createdById"
  ),
  (
    SELECT "creator"."id"
    FROM "Account" AS "account"
    JOIN "Citizen" AS "creator" ON "creator"."discordId" = "account"."providerAccountId"
    WHERE "account"."userId" = "created"."createdById"
      AND "account"."provider" = 'discord'
    ORDER BY "creator"."deletedAt" NULLS FIRST, "creator"."createdAt" DESC
    LIMIT 1
  )
)
WHERE "createdById" IS NOT NULL;

ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- A deleted citizen keeps no login. The delete clears the link, and this
-- refuses a sign-in that links the citizen again at the same time.
ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_deleted_login_check" CHECK (
  "deletedAt" IS NULL OR "userId" IS NULL
);

-- Wiki tree: an update that writes the same parent again (for example the
-- sort order of the siblings) does not take the tree lock anymore. Each
-- move takes the lock as its first statement, thus two transactions that
-- update siblings cannot wait for each other.
DROP TRIGGER "WikiPage_check_parent" ON "WikiPage";

CREATE TRIGGER "WikiPage_check_parent_insert"
BEFORE INSERT ON "WikiPage"
FOR EACH ROW EXECUTE FUNCTION "WikiPage_check_parent"();

CREATE TRIGGER "WikiPage_check_parent_update"
BEFORE UPDATE OF "parentId", "namespace", "eventId", "templateId" ON "WikiPage"
FOR EACH ROW
WHEN (
  OLD."parentId" IS DISTINCT FROM NEW."parentId"
  OR OLD."namespace" IS DISTINCT FROM NEW."namespace"
  OR OLD."eventId" IS DISTINCT FROM NEW."eventId"
  OR OLD."templateId" IS DISTINCT FROM NEW."templateId"
)
EXECUTE FUNCTION "WikiPage_check_parent"();
