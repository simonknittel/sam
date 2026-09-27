-- Database rules that only the app enforced before, the indexes of the
-- frequent paths, and the columns and tables that nothing reads.

-- Event participants: one active sign-up for each person and event with
-- partial unique indexes instead of the two mirror columns
UPDATE "EventParticipant" AS "participant"
SET "citizenId" = "citizen"."id"
FROM "Citizen" AS "citizen"
WHERE "participant"."citizenId" IS NULL
  AND "participant"."source" = 'DISCORD'
  AND "citizen"."discordId" = "participant"."discordUserId"
  AND "citizen"."deletedAt" IS NULL;

UPDATE "Event" AS "event"
SET "createdById" = "citizen"."id"
FROM "Citizen" AS "citizen"
WHERE "event"."createdById" IS NULL
  AND "event"."source" = 'DISCORD'
  AND "citizen"."discordId" = "event"."discordCreatorId"
  AND "citizen"."deletedAt" IS NULL;

-- DropIndex
DROP INDEX "EventParticipant_eventId_activeCitizenId_key";

-- DropIndex
DROP INDEX "EventParticipant_eventId_activeDiscordUserId_key";

-- AlterTable
ALTER TABLE "EventParticipant" DROP COLUMN "activeCitizenId",
DROP COLUMN "activeDiscordUserId";

-- CreateIndex
CREATE UNIQUE INDEX "EventParticipant_active_citizen_key" ON "EventParticipant"("eventId", "citizenId") WHERE ("cancelledAt" IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "EventParticipant_active_discordUser_key" ON "EventParticipant"("eventId", "discordUserId") WHERE ("cancelledAt" IS NULL);

-- An APP sign-up has a citizen and no Discord user. A DISCORD sign-up has
-- a Discord user and the matching citizen if one exists.
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_identity_check" CHECK (
  CASE "source"
    WHEN 'APP' THEN "citizenId" IS NOT NULL AND "discordUserId" IS NULL
    ELSE "discordUserId" IS NOT NULL
  END
);

ALTER TABLE "Event" ADD CONSTRAINT "Event_source_check" CHECK (
  ("source" = 'DISCORD') = ("discordId" IS NOT NULL)
);

-- Wiki: a parent in the same namespace and container, and no cycle. The
-- advisory lock puts the moves one after the other: a second move reads the
-- tree only after the first move committed (each statement of the function
-- reads with a new snapshot).
CREATE FUNCTION "WikiPage_check_parent"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  "parent" "WikiPage"%ROWTYPE;
BEGIN
  IF NEW."parentId" IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    PERFORM pg_advisory_xact_lock(hashtext('WikiPage_hierarchy'));
  END IF;

  SELECT * INTO "parent" FROM "WikiPage" WHERE "id" = NEW."parentId";

  IF "parent"."namespace" <> NEW."namespace"
    OR "parent"."eventId" IS DISTINCT FROM NEW."eventId"
    OR "parent"."templateId" IS DISTINCT FROM NEW."templateId" THEN
    RAISE EXCEPTION 'The parent of wiki page % is in another namespace or container', NEW."id"
      USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'UPDATE' AND EXISTS (
    WITH RECURSIVE "ancestors"("id", "parentId") AS (
      SELECT "id", "parentId" FROM "WikiPage" WHERE "id" = NEW."parentId"
      UNION
      SELECT "page"."id", "page"."parentId"
      FROM "WikiPage" AS "page"
      JOIN "ancestors" ON "page"."id" = "ancestors"."parentId"
    )
    SELECT 1 FROM "ancestors" WHERE "ancestors"."id" = NEW."id"
  ) THEN
    RAISE EXCEPTION 'Wiki page % cannot be below itself', NEW."id"
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "WikiPage_check_parent"
BEFORE INSERT OR UPDATE OF "parentId", "namespace", "eventId", "templateId" ON "WikiPage"
FOR EACH ROW EXECUTE FUNCTION "WikiPage_check_parent"();

ALTER TABLE "WikiPage" ADD CONSTRAINT "WikiPage_public_top_level_check" CHECK (
  "parentId" IS NULL OR "visibility" <> 'PUBLIC'
);

-- Wiki tags: the name is unique per scope without letter case
CREATE EXTENSION IF NOT EXISTS citext;

-- AlterTable
ALTER TABLE "WikiTag" ALTER COLUMN "name" SET DATA TYPE CITEXT;

-- Citizens: day and month of the birthday together, and a real date
ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_birthday_check" CHECK (
  num_nulls("birthdayDay", "birthdayMonth") IN (0, 2)
  AND ("birthdayMonth" IS NULL OR "birthdayMonth" BETWEEN 1 AND 12)
  AND (
    "birthdayDay" IS NULL
    OR "birthdayDay" BETWEEN 1 AND CASE "birthdayMonth"
      WHEN 2 THEN 29
      WHEN 4 THEN 30
      WHEN 6 THEN 30
      WHEN 9 THEN 30
      WHEN 11 THEN 30
      ELSE 31
    END
  )
);

-- Organizations: LEFT is only a type of the membership history
ALTER TABLE "ActiveOrganizationMembership" ADD CONSTRAINT "ActiveOrganizationMembership_type_check" CHECK (
  "type" <> 'LEFT'
);

-- Lineup: a variant is required only one time for each position
DELETE FROM "EventPositionRequiredVariant" AS "duplicate"
USING "EventPositionRequiredVariant" AS "kept"
WHERE "duplicate"."positionId" = "kept"."positionId"
  AND "duplicate"."variantId" = "kept"."variantId"
  AND ("duplicate"."order", "duplicate"."id") > ("kept"."order", "kept"."id");

-- CreateIndex
CREATE UNIQUE INDEX "EventPositionRequiredVariant_positionId_variantId_key" ON "EventPositionRequiredVariant"("positionId", "variantId");

-- AlterTable
ALTER TABLE "EventPositionRequiredVariant" ALTER COLUMN "order" DROP DEFAULT;

-- Fleet: the series name is unique in the whole fleet, thus the compound
-- unique index adds nothing
DROP INDEX "Series_name_manufacturerId_key";

-- Admin flag: an enum instead of free text. An empty text means no role.
CREATE TYPE "UserRole" AS ENUM ('ADMIN');

ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING (upper(NULLIF("role", '')))::"UserRole";

-- Dead items: nothing reads these columns and this table (0 rows each)
ALTER TABLE "_EventPositionToRole" DROP CONSTRAINT "_EventPositionToRole_A_fkey";

ALTER TABLE "_EventPositionToRole" DROP CONSTRAINT "_EventPositionToRole_B_fkey";

DROP TABLE "_EventPositionToRole";

ALTER TABLE "Role" DROP COLUMN "inactivityThreshold";

ALTER TABLE "FlowEdge" DROP COLUMN "type";

-- Indexes: a unique index or the primary key covers these, or the planner
-- does not use them
DROP INDEX "ActiveOrganizationMembership_organizationId_idx";

DROP INDEX "ChangelogEntrySeen_citizenId_idx";

DROP INDEX "CitizenLog_type_idx";

DROP INDEX "NotificationSetting_citizenId_idx";

DROP INDEX "OnboardingStepProgress_citizenId_idx";

DROP INDEX "OnboardingTaskProgress_citizenId_idx";

DROP INDEX "Role_assignAfterInactiveDays_idx";

DROP INDEX "Role_maxAgeDays_idx";

DROP INDEX "RoleAssignmentChange_citizenId_idx";

DROP INDEX "RoleAssignmentLevelChange_citizenId_idx";

DROP INDEX "SeasonalThemeSetting_citizenId_idx";

DROP INDEX "SilcTransaction_receiverId_idx";

-- Indexes of the frequent paths
CREATE INDEX "ActiveOrganizationMembership_citizenId_idx" ON "ActiveOrganizationMembership"("citizenId");

CREATE INDEX "CitizenLog_citizenId_type_createdAt_idx" ON "CitizenLog"("citizenId", "type", "createdAt" DESC);

CREATE INDEX "EventPosition_parentPositionId_idx" ON "EventPosition"("parentPositionId");

CREATE INDEX "EventVisibilityRole_roleId_idx" ON "EventVisibilityRole"("roleId");

CREATE INDEX "FlowEdge_sourceId_idx" ON "FlowEdge"("sourceId");

CREATE INDEX "FlowEdge_targetId_idx" ON "FlowEdge"("targetId");

CREATE INDEX "FlowNode_flowId_idx" ON "FlowNode"("flowId");

CREATE INDEX "RoleAssignment_roleId_idx" ON "RoleAssignment"("roleId");

CREATE INDEX "RoleAssignmentChange_citizenId_createdAt_id_idx" ON "RoleAssignmentChange"("citizenId", "createdAt", "id");

CREATE INDEX "RoleAssignmentChange_createdAt_id_idx" ON "RoleAssignmentChange"("createdAt", "id");

CREATE INDEX "RoleAssignmentLevelChange_citizenId_createdAt_id_idx" ON "RoleAssignmentLevelChange"("citizenId", "createdAt", "id");

CREATE INDEX "RoleAssignmentLevelChange_createdAt_id_idx" ON "RoleAssignmentLevelChange"("createdAt", "id");

CREATE INDEX "Ship_ownerId_idx" ON "Ship"("ownerId");

CREATE INDEX "Ship_variantId_idx" ON "Ship"("variantId");

CREATE INDEX "SilcTransaction_receiverId_createdAt_idx" ON "SilcTransaction"("receiverId", "createdAt");

CREATE INDEX "SilcTransaction_createdAt_idx" ON "SilcTransaction"("createdAt");

CREATE INDEX "Upload_createdAt_idx" ON "Upload"("createdAt");
