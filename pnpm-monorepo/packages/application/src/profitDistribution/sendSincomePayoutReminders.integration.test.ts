import { prisma } from "@sam-monorepo/database";
import { beforeEach, expect, test } from "vitest";
import {
  createTestApplicationContext,
  TEST_NOW,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { sendSincomePayoutReminders } from "./sendSincomePayoutReminders.js";

const ONE_MINUTE_IN_MILLISECONDS = 60 * 1000;
const ONE_DAY_IN_MILLISECONDS = 24 * 60 * ONE_MINUTE_IN_MILLISECONDS;
const LAST_WEEK = new Date(TEST_NOW.getTime() - 7 * ONE_DAY_IN_MILLISECONDS);
/** The start of the window of the run at `TEST_NOW` */
const WINDOW_START = TEST_NOW.getTime() + ONE_DAY_IN_MILLISECONDS;

/** A cycle whose payout started last week */
const createCycleInPayout = (
  payoutEndsAt: number,
  payoutEndedAt: Date | null = null,
) =>
  prisma.profitDistributionCycle.create({
    data: {
      title: "Q3",
      collectionEndsAt: LAST_WEEK,
      collectionEndedAt: LAST_WEEK,
      payoutStartedAt: LAST_WEEK,
      payoutEndsAt: new Date(payoutEndsAt),
      payoutEndedAt,
    },
  });

beforeEach(async () => {
  await truncateAllTables();
});

test("requests one reminder for each cycle in the payout phase whose planned end is in the window of the run", async () => {
  const atWindowStart = await createCycleInPayout(WINDOW_START);
  const beforeWindowEnd = await createCycleInPayout(
    WINDOW_START + 15 * ONE_MINUTE_IN_MILLISECONDS - 1,
  );
  await createCycleInPayout(WINDOW_START - 1);
  await createCycleInPayout(WINDOW_START + 15 * ONE_MINUTE_IN_MILLISECONDS);
  // A manager ended the payout before its planned end
  await createCycleInPayout(WINDOW_START, TEST_NOW);
  const { context, notifications } = createTestApplicationContext();

  await expect(sendSincomePayoutReminders(context)).resolves.toEqual({
    cycleCount: 2,
    notificationsSent: true,
  });
  expect(notifications).toHaveLength(2);
  expect(notifications).toEqual(
    expect.arrayContaining(
      [atWindowStart, beforeWindowEnd].map((cycle) => ({
        type: "ProfitDistributionPayoutReminder",
        payload: { cycleId: cycle.id },
      })),
    ),
  );
});
