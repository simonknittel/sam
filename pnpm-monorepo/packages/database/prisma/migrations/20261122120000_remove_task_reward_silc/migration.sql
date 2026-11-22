-- Remove the reward type SILC (the creator of the task paid the reward). The
-- tasks with this reward type keep the reward as a text.
BEGIN;
UPDATE "Task"
SET "rewardType" = 'TEXT',
  "rewardTypeTextValue" = "rewardSilcValue" || ' SILC (vom Ersteller bezahlt)',
  "rewardSilcValue" = NULL
WHERE "rewardType" = 'SILC';

-- The reward CHECK constraint compares the column with a value of the old
-- enum type: the type change refuses it, thus the constraint is made again
ALTER TABLE "Task" DROP CONSTRAINT "Task_reward_check";

CREATE TYPE "TaskRewardType_new" AS ENUM ('NEW_SILC', 'TEXT');
ALTER TABLE "Task" ALTER COLUMN "rewardType" TYPE "TaskRewardType_new" USING ("rewardType"::text::"TaskRewardType_new");
ALTER TYPE "TaskRewardType" RENAME TO "TaskRewardType_old";
ALTER TYPE "TaskRewardType_new" RENAME TO "TaskRewardType";
DROP TYPE "public"."TaskRewardType_old";

ALTER TABLE "Task" ADD CONSTRAINT "Task_reward_check" CHECK (
  CASE "rewardType"
    WHEN 'TEXT' THEN "rewardSilcValue" IS NULL AND "rewardTypeTextValue" IS NOT NULL
    ELSE "rewardSilcValue" IS NOT NULL AND "rewardTypeTextValue" IS NULL
  END
);
COMMIT;
