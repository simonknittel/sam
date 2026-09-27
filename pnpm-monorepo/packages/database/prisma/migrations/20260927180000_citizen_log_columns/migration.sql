-- Moves the confirmation and the note classification of the citizen logs
-- from key-value rows (CitizenLogAttribute) into columns, and removes the old
-- role history from the logs.

-- AlterTable
ALTER TABLE "CitizenLog" ADD COLUMN     "classificationLevelId" TEXT,
ADD COLUMN     "confirmed" "ConfirmationStatus",
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedById" TEXT,
ADD COLUMN     "noteTypeId" TEXT;

-- The old role history. Scripts 006 and 011 moved it to RoleAssignmentChange.
DELETE FROM "CitizenLog" WHERE "type" IN ('role-added', 'role-removed');

-- The latest attribute of each key wins, as getLatestNoteAttributes read it
UPDATE "CitizenLog" AS "log"
SET "confirmed" = CASE "attribute"."value"
      WHEN 'confirmed' THEN 'CONFIRMED'
      ELSE 'FALSE_REPORT'
    END::"ConfirmationStatus",
    "confirmedAt" = "attribute"."createdAt",
    "confirmedById" = "attribute"."createdById"
FROM (
  SELECT DISTINCT ON ("citizenLogId") "citizenLogId", "value", "createdAt", "createdById"
  FROM "CitizenLogAttribute"
  WHERE "key" = 'confirmed'
  ORDER BY "citizenLogId", "createdAt" DESC
) AS "attribute"
WHERE "attribute"."citizenLogId" = "log"."id";

UPDATE "CitizenLog" AS "log"
SET "noteTypeId" = "attribute"."value"
FROM (
  SELECT DISTINCT ON ("citizenLogId") "citizenLogId", "value"
  FROM "CitizenLogAttribute"
  WHERE "key" = 'noteTypeId'
  ORDER BY "citizenLogId", "createdAt" DESC
) AS "attribute"
WHERE "attribute"."citizenLogId" = "log"."id"
  AND EXISTS (SELECT 1 FROM "NoteType" WHERE "NoteType"."id" = "attribute"."value");

UPDATE "CitizenLog" AS "log"
SET "classificationLevelId" = "attribute"."value"
FROM (
  SELECT DISTINCT ON ("citizenLogId") "citizenLogId", "value"
  FROM "CitizenLogAttribute"
  WHERE "key" = 'classificationLevelId'
  ORDER BY "citizenLogId", "createdAt" DESC
) AS "attribute"
WHERE "attribute"."citizenLogId" = "log"."id"
  AND EXISTS (
    SELECT 1 FROM "ClassificationLevel"
    WHERE "ClassificationLevel"."id" = "attribute"."value"
  );

-- DropTable
DROP TABLE "CitizenLogAttribute";

ALTER TABLE "CitizenLog" ADD CONSTRAINT "CitizenLog_type_check" CHECK (
  "type" IN ('handle', 'discord-id', 'teamspeak-id', 'citizen-id', 'community-moniker', 'spectrum-id', 'note')
);
ALTER TABLE "CitizenLog" ADD CONSTRAINT "CitizenLog_confirmation_check" CHECK (
  ("confirmed" IS NULL) = ("confirmedAt" IS NULL)
);
ALTER TABLE "CitizenLog" ADD CONSTRAINT "CitizenLog_note_classification_check" CHECK (
  "type" = 'note' OR ("noteTypeId" IS NULL AND "classificationLevelId" IS NULL)
);

-- AddForeignKey
ALTER TABLE "CitizenLog" ADD CONSTRAINT "CitizenLog_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitizenLog" ADD CONSTRAINT "CitizenLog_noteTypeId_fkey" FOREIGN KEY ("noteTypeId") REFERENCES "NoteType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitizenLog" ADD CONSTRAINT "CitizenLog_classificationLevelId_fkey" FOREIGN KEY ("classificationLevelId") REFERENCES "ClassificationLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
