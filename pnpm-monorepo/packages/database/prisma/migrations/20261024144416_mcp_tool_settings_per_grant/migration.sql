-- AlterTable
ALTER TABLE "OAuthGrant" ADD COLUMN     "customName" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- The tool settings move from the user to the connected client (the grant).
-- Each setting of a user becomes one setting for each grant of the user that
-- is not revoked. The ids have the alphabet of the cuids.
ALTER TABLE "McpToolSetting" DROP CONSTRAINT "McpToolSetting_userId_fkey";

DROP INDEX "McpToolSetting_userId_toolName_key";

ALTER TABLE "McpToolSetting" ADD COLUMN     "grantId" TEXT;

INSERT INTO "McpToolSetting" ("id", "userId", "grantId", "toolName", "disabledAt")
SELECT replace(gen_random_uuid()::text, '-', ''), user_setting."userId", oauth_grant."id", user_setting."toolName", user_setting."disabledAt"
FROM "McpToolSetting" AS user_setting
JOIN "OAuthGrant" AS oauth_grant ON oauth_grant."userId" = user_setting."userId" AND oauth_grant."revokedAt" IS NULL
WHERE user_setting."grantId" IS NULL;

DELETE FROM "McpToolSetting" WHERE "grantId" IS NULL;

ALTER TABLE "McpToolSetting" DROP COLUMN "userId",
ALTER COLUMN "grantId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "McpToolSetting_grantId_toolName_key" ON "McpToolSetting"("grantId", "toolName");

-- AddForeignKey
ALTER TABLE "McpToolSetting" ADD CONSTRAINT "McpToolSetting_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "OAuthGrant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
