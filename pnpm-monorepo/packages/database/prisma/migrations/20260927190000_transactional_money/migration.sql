-- Database rules for the money paths: one reward column for SILC tasks,
-- the planned and the actual end of each profit cycle phase, one salary for
-- each role and day, and a valid conversion rate.

-- Task: SILC and NEW_SILC share one value column, the reward type already
-- says who pays
ALTER TABLE "Task" ADD COLUMN "rewardSilcValue" INTEGER;
UPDATE "Task" SET "rewardSilcValue" = COALESCE("rewardTypeSilcValue", "rewardTypeNewSilcValue");
ALTER TABLE "Task" DROP COLUMN "rewardTypeSilcValue",
DROP COLUMN "rewardTypeNewSilcValue";

UPDATE "Task" SET "hiddenForOtherRoles" = false WHERE "hiddenForOtherRoles" IS NULL;
UPDATE "Task" SET "canSelfComplete" = false WHERE "canSelfComplete" IS NULL;
ALTER TABLE "Task" ALTER COLUMN "hiddenForOtherRoles" SET NOT NULL,
ALTER COLUMN "hiddenForOtherRoles" SET DEFAULT false,
ALTER COLUMN "canSelfComplete" SET NOT NULL,
ALTER COLUMN "canSelfComplete" SET DEFAULT false;

ALTER TABLE "Task" ADD CONSTRAINT "Task_reward_check" CHECK (
  CASE "rewardType"
    WHEN 'TEXT' THEN "rewardSilcValue" IS NULL AND "rewardTypeTextValue" IS NOT NULL
    ELSE "rewardSilcValue" IS NOT NULL AND "rewardTypeTextValue" IS NULL
  END
);
ALTER TABLE "Task" ADD CONSTRAINT "Task_counts_check" CHECK (
  "repeatable" >= 1 AND ("assignmentLimit" IS NULL OR "assignmentLimit" >= 1)
);

-- Profit cycles: the old end columns held the planned end until the phase
-- ended and the actual end after it
ALTER TABLE "ProfitDistributionCycle" RENAME COLUMN "collectionEndedAt" TO "collectionEndsAt";
ALTER TABLE "ProfitDistributionCycle" ADD COLUMN "collectionEndedAt" TIMESTAMP(3);
UPDATE "ProfitDistributionCycle" AS "cycle"
SET "collectionEndedAt" = "collectionEndsAt"
WHERE "collectionEndedById" IS NOT NULL
  OR "collectionEndedByAutomation" IS NOT NULL
  OR EXISTS (
    SELECT 1 FROM "ProfitDistributionCycleParticipant" AS "participant"
    WHERE "participant"."cycleId" = "cycle"."id"
      AND "participant"."silcBalanceSnapshot" IS NOT NULL
  );

ALTER TABLE "ProfitDistributionCycle" RENAME COLUMN "payoutEndedAt" TO "payoutEndsAt";
ALTER TABLE "ProfitDistributionCycle" ADD COLUMN "payoutEndedAt" TIMESTAMP(3);
UPDATE "ProfitDistributionCycle"
SET "payoutEndedAt" = "payoutEndsAt"
WHERE "payoutEndedById" IS NOT NULL OR "payoutEndedByAutomation" IS NOT NULL;

ALTER TABLE "ProfitDistributionCycle" DROP COLUMN "collectionEndedByAutomation",
DROP COLUMN "payoutEndedByAutomation";

ALTER TABLE "ProfitDistributionCycle" ADD CONSTRAINT "ProfitDistributionCycle_phase_order_check" CHECK (
  ("payoutStartedAt" IS NULL OR "collectionEndedAt" IS NOT NULL)
  AND ("payoutEndedAt" IS NULL OR "payoutStartedAt" IS NOT NULL)
  AND ("payoutEndsAt" IS NULL OR "payoutStartedAt" IS NOT NULL)
  AND ("collectionEndedById" IS NULL OR "collectionEndedAt" IS NOT NULL)
  AND ("payoutEndedById" IS NULL OR "payoutEndedAt" IS NOT NULL)
);

-- Salaries: one salary for each role and day of the month
ALTER TABLE "SilcRoleSalary" ADD CONSTRAINT "SilcRoleSalary_dayOfMonth_check" CHECK (
  "dayOfMonth" BETWEEN 1 AND 31
);

-- CreateIndex
CREATE UNIQUE INDEX "SilcRoleSalary_roleId_dayOfMonth_key" ON "SilcRoleSalary"("roleId", "dayOfMonth");

-- Settings: the conversion rate is a positive whole number
ALTER TABLE "SilcSetting" ADD CONSTRAINT "SilcSetting_value_check" CHECK (
  "key" <> 'AUEC_CONVERSION_RATE' OR "value" ~ '^[1-9][0-9]*$'
);
