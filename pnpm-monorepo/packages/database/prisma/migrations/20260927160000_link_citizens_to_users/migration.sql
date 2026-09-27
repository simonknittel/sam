-- Links each citizen to its login. The app found the login before through the
-- Discord ID: the Discord account of the user has the Discord ID of the
-- citizen as its provider account ID.

-- AlterTable
ALTER TABLE "Citizen" ADD COLUMN     "userId" TEXT;

-- The same join that the session used. A user with more than one Discord
-- account keeps one link, because each user has at most one citizen.
UPDATE "Citizen" AS "citizen"
SET "userId" = "link"."userId"
FROM (
  SELECT DISTINCT ON ("account"."userId") "account"."userId", "linked"."id" AS "citizenId"
  FROM "Account" AS "account"
  JOIN "Citizen" AS "linked" ON "linked"."discordId" = "account"."providerAccountId"
  WHERE "account"."provider" = 'discord'
  ORDER BY "account"."userId", "linked"."id"
) AS "link"
WHERE "citizen"."id" = "link"."citizenId";

-- CreateIndex
CREATE UNIQUE INDEX "Citizen_userId_key" ON "Citizen"("userId");

-- AddForeignKey
ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
