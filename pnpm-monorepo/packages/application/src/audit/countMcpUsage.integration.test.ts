import { prisma } from "@sam-monorepo/database";
import { AuditEventType } from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import { createTestApplicationContext } from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { countMcpUsage } from "./countMcpUsage.js";

beforeEach(async () => {
  await truncateAllTables();
});

test("stores the count of the MCP events under the day that it counts in Europe/Berlin", async () => {
  /**
   * The counted day 2026-10-25 has 25 hours: the daylight saving time ends.
   * The result must not depend on the time zone of the process.
   */
  await prisma.auditEvent.createMany({
    data: [
      { createdAt: "2026-10-24T23:30:00+02:00", triggeredViaMcp: true },
      { createdAt: "2026-10-25T00:30:00+02:00", triggeredViaMcp: true },
      { createdAt: "2026-10-25T12:00:00+01:00", triggeredViaMcp: false },
      { createdAt: "2026-10-25T23:30:00+01:00", triggeredViaMcp: true },
      { createdAt: "2026-10-26T00:00:01+01:00", triggeredViaMcp: true },
    ].map(({ createdAt, triggeredViaMcp }) => ({
      type: AuditEventType.EVENT_CREATED_IN_APP,
      data: {},
      createdAt: new Date(createdAt),
      triggeredViaMcp,
    })),
  });

  const { context, auditEvents } = createTestApplicationContext({
    now: new Date("2026-10-26T00:00:05+01:00"),
  });

  const output = await countMcpUsage(context);

  expect(output).toEqual({ date: "2026-10-25", count: 2, saved: true });
  const rows = await prisma.dailyMcpUsageCount.findMany();
  expect(
    rows.map((row) => ({
      day: row.day.toISOString().slice(0, 10),
      count: row.count,
    })),
  ).toEqual([{ day: "2026-10-25", count: 2 }]);
  expect(auditEvents).toEqual([
    {
      type: AuditEventType.MCP_USAGE_COUNTED,
      data: { date: "2026-10-24T22:00:00.000Z", count: 2 },
      createdById: null,
    },
  ]);
});
