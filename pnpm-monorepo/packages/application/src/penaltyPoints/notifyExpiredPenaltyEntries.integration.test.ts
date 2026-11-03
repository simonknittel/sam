import { prisma } from "@sam-monorepo/database";
import { beforeEach, expect, test } from "vitest";
import {
  createTestApplicationContext,
  TEST_NOW,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { notifyExpiredPenaltyEntries } from "./notifyExpiredPenaltyEntries.js";

const ONE_MINUTE_IN_MILLISECONDS = 60 * 1000;
/** The start of the window of the run at `TEST_NOW`: the time of the last run */
const WINDOW_START = TEST_NOW.getTime() - 15 * ONE_MINUTE_IN_MILLISECONDS;

const createPenaltyEntry = async (
  expiresAt: number | null,
  deletedAt: Date | null = null,
) => {
  const citizen = await prisma.citizen.create({ data: {} });

  return prisma.penaltyEntry.create({
    data: {
      citizenId: citizen.id,
      points: 3,
      reason: "Test",
      expiresAt: expiresAt === null ? null : new Date(expiresAt),
      deletedAt,
    },
  });
};

beforeEach(async () => {
  await truncateAllTables();
});

test("requests one notification for each entry that expired since the last run", async () => {
  const atWindowStart = await createPenaltyEntry(WINDOW_START);
  const beforeNow = await createPenaltyEntry(TEST_NOW.getTime() - 1);
  await createPenaltyEntry(WINDOW_START - 1);
  // The entry still counts now
  await createPenaltyEntry(TEST_NOW.getTime());
  await createPenaltyEntry(null);
  await createPenaltyEntry(WINDOW_START, TEST_NOW);
  const { context, notifications } = createTestApplicationContext();

  await expect(notifyExpiredPenaltyEntries(context)).resolves.toEqual({
    penaltyEntryCount: 2,
    notificationsSent: true,
  });
  expect(notifications).toHaveLength(2);
  expect(notifications).toEqual(
    expect.arrayContaining(
      [atWindowStart, beforeNow].map((penaltyEntry) => ({
        type: "PenaltyEntryExpired",
        payload: { penaltyEntryId: penaltyEntry.id },
      })),
    ),
  );
});
