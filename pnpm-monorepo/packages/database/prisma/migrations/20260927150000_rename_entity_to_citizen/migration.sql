-- Renames the citizen models: Entity becomes Citizen, EntityLog becomes
-- CitizenLog and EntityLogAttribute becomes CitizenLogAttribute. The RSI
-- citizen record number moves from "citizenId" to "citizenRecord", because
-- "citizenId" names a reference to a citizen everywhere else. Only names
-- change, no data. Prisma would drop and create the tables, thus this
-- migration is written by hand.

ALTER TABLE "Entity" RENAME TO "Citizen";
ALTER TABLE "Citizen" RENAME COLUMN "citizenId" TO "citizenRecord";
ALTER TABLE "Citizen" RENAME CONSTRAINT "Entity_pkey" TO "Citizen_pkey";
ALTER TABLE "Citizen" RENAME CONSTRAINT "Entity_createdById_fkey" TO "Citizen_createdById_fkey";
ALTER INDEX "Entity_discordId_key" RENAME TO "Citizen_discordId_key";

ALTER TABLE "EntityLog" RENAME TO "CitizenLog";
ALTER TABLE "CitizenLog" RENAME COLUMN "entityId" TO "citizenId";
ALTER TABLE "CitizenLog" RENAME CONSTRAINT "EntityLog_pkey" TO "CitizenLog_pkey";
ALTER TABLE "CitizenLog" RENAME CONSTRAINT "EntityLog_entityId_fkey" TO "CitizenLog_citizenId_fkey";
ALTER TABLE "CitizenLog" RENAME CONSTRAINT "EntityLog_submittedById_fkey" TO "CitizenLog_submittedById_fkey";
ALTER INDEX "EntityLog_type_idx" RENAME TO "CitizenLog_type_idx";

ALTER TABLE "EntityLogAttribute" RENAME TO "CitizenLogAttribute";
ALTER TABLE "CitizenLogAttribute" RENAME COLUMN "eneityLogId" TO "citizenLogId";
ALTER TABLE "CitizenLogAttribute" RENAME CONSTRAINT "EntityLogAttribute_pkey" TO "CitizenLogAttribute_pkey";
ALTER TABLE "CitizenLogAttribute" RENAME CONSTRAINT "EntityLogAttribute_eneityLogId_fkey" TO "CitizenLogAttribute_citizenLogId_fkey";
ALTER TABLE "CitizenLogAttribute" RENAME CONSTRAINT "EntityLogAttribute_createdById_fkey" TO "CitizenLogAttribute_createdById_fkey";
ALTER INDEX "EntityLogAttribute_key_idx" RENAME TO "CitizenLogAttribute_key_idx";

-- PostgreSQL 18 names NOT NULL constraints "<table>_<column>_not_null".
-- Older versions have no such constraints, thus the loop renames only the
-- ones that exist.
DO $$
DECLARE
  item record;
  new_name text;
BEGIN
  FOR item IN
    SELECT "constraint"."conrelid"::regclass AS "table_name",
           "constraint"."conname",
           "attribute"."attname"
    FROM "pg_constraint" AS "constraint"
    JOIN "pg_attribute" AS "attribute"
      ON "attribute"."attrelid" = "constraint"."conrelid"
     AND "attribute"."attnum" = "constraint"."conkey"[1]
    WHERE "constraint"."contype" = 'n'
      AND "constraint"."conrelid" IN (
        '"Citizen"'::regclass,
        '"CitizenLog"'::regclass,
        '"CitizenLogAttribute"'::regclass
      )
  LOOP
    new_name := replace(item.table_name::text, '"', '') || '_' || item.attname || '_not_null';
    IF item.conname <> new_name THEN
      EXECUTE format('ALTER TABLE %s RENAME CONSTRAINT %I TO %I', item.table_name, item.conname, new_name);
    END IF;
  END LOOP;
END $$;
