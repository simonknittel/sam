import { prisma } from "@sam-monorepo/database";
import { beforeEach, expect, test } from "vitest";
import { createTestApplicationContext } from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { sendSincomePayoutReminders } from "./sendSincomePayoutReminders.js";

/** 2026-11-10 07:30 in Europe/Berlin (UTC+1) */
const REMINDER_TIME = new Date("2026-11-10T07:30:00+01:00");

const LAST_WEEK = new Date("2026-11-03T12:00:00Z");

/**
 * A cycle whose payout started last week. The planned end is a date, which
 * the database stores as midnight UTC, like the form of the app sends it.
 */
const createCycleInPayout = (
  payoutEndsAt: string,
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

test("the run at 07:30 requests one reminder for each cycle in the payout phase whose last day is today", async () => {
  const endsToday = await createCycleInPayout("2026-11-10");
  // Its last day was yesterday
  await createCycleInPayout("2026-11-09");
  // Today is the day before its last day
  await createCycleInPayout("2026-11-11");
  // A manager ended the payout before its planned end
  await createCycleInPayout("2026-11-10", LAST_WEEK);
  const { context, notifications } = createTestApplicationContext({
    now: REMINDER_TIME,
  });

  await expect(sendSincomePayoutReminders(context)).resolves.toEqual({
    isReminderRun: true,
    cycleCount: 1,
    notificationsSent: true,
  });
  expect(notifications).toEqual([
    {
      type: "ProfitDistributionPayoutReminder",
      payload: { cycleId: endsToday.id },
    },
  ]);
});

test("the other runs of the last day request no reminder", async () => {
  await createCycleInPayout("2026-11-10");

  for (const now of [
    "2026-11-10T00:00:00+01:00",
    "2026-11-10T07:15:00+01:00",
    "2026-11-10T07:45:00+01:00",
  ]) {
    const { context, notifications } = createTestApplicationContext({
      now: new Date(now),
    });

    await expect(sendSincomePayoutReminders(context)).resolves.toEqual({
      isReminderRun: false,
      cycleCount: 0,
      notificationsSent: true,
    });
    expect(notifications).toEqual([]);
  }
});
