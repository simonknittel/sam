import { prisma } from "@sam-monorepo/database";
import { AuditEventType } from "@sam-monorepo/domain";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { truncateAllTables } from "../../test/database";
import { countUniqueLogins } from "./countUniqueLogins";

beforeEach(async () => {
  await truncateAllTables();
});

afterEach(() => {
  vi.useRealTimers();
});

test("stores the count under the day that it counts in Europe/Berlin", async () => {
  // The scheduler starts the function at midnight in Europe/Berlin
  vi.setSystemTime(new Date("2026-09-16T00:00:05+02:00"));
  await prisma.user.createMany({
    data: [
      { lastSeenAt: new Date("2026-09-15T00:30:00+02:00") },
      { lastSeenAt: new Date("2026-09-15T23:30:00+02:00") },
      { lastSeenAt: new Date("2026-09-14T23:30:00+02:00") },
    ],
  });

  await countUniqueLogins();

  const rows = await prisma.dailyLoginCount.findMany();
  expect(
    rows.map((row) => ({
      date: row.date.toISOString().slice(0, 10),
      count: row.count,
    })),
  ).toEqual([{ date: "2026-09-15", count: 2 }]);
});

test("a second run later in the night keeps the count of the first run", async () => {
  vi.setSystemTime(new Date("2026-09-16T00:00:05+02:00"));
  const [returningUser] = await prisma.user.createManyAndReturn({
    data: [
      { lastSeenAt: new Date("2026-09-15T20:00:00+02:00") },
      { lastSeenAt: new Date("2026-09-15T21:00:00+02:00") },
    ],
  });
  await countUniqueLogins();

  // A user of the counted day visits again after midnight
  await prisma.user.update({
    where: { id: returningUser!.id },
    data: { lastSeenAt: new Date("2026-09-16T00:30:00+02:00") },
  });
  vi.setSystemTime(new Date("2026-09-16T01:00:00+02:00"));
  await countUniqueLogins();

  const rows = await prisma.dailyLoginCount.findMany();
  expect(rows.map((row) => row.count)).toEqual([2]);
  expect(
    await prisma.auditEvent.count({
      where: { type: AuditEventType.UNIQUE_LOGINS_COUNTED },
    }),
  ).toBe(1);
});
