-- A role that inherits itself adds nothing and is never intentional. Prisma
-- cannot express a CHECK constraint in the schema, so this migration is
-- hand-written. The DELETE clears the rows that the constraint would reject.
DELETE FROM "_inheritance" WHERE "A" = "B";

ALTER TABLE "_inheritance" ADD CONSTRAINT "_inheritance_no_self" CHECK ("A" <> "B");
