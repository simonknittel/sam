import {
  AuditEventType,
  getLocalDate,
  getStartOfLocalDay,
  getYesterdayDateColumnValue,
  ORGANIZATION_TIMEZONE,
} from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";

export interface CountMcpUsageOutput {
  /** The counted day as "YYYY-MM-DD" */
  readonly date: string;
  readonly count: number;
  /** False when an earlier run saved the count of this day already */
  readonly saved: boolean;
}

/**
 * Counts the day that just ended: the day before the run in the time zone of
 * the organization
 */
export const countMcpUsage = (
  context: ApplicationContext,
): Promise<CountMcpUsageOutput> =>
  withSpan(context, "countMcpUsage", async () => {
    const now = context.now();
    const today = getLocalDate(now, ORGANIZATION_TIMEZONE);
    const startOfToday = getStartOfLocalDay(today, ORGANIZATION_TIMEZONE);
    const startOfCountedDay = getStartOfLocalDay(
      { ...today, day: today.day - 1 },
      ORGANIZATION_TIMEZONE,
    );
    const countedDay = getYesterdayDateColumnValue(now);
    const date = countedDay.toISOString().slice(0, 10);

    const count = await context.prisma.auditEvent.count({
      where: {
        triggeredViaMcp: true,
        createdAt: {
          gte: startOfCountedDay,
          lt: startOfToday,
        },
      },
    });

    const created = await context.prisma.dailyMcpUsageCount.createMany({
      data: [{ day: countedDay, count }],
      skipDuplicates: true,
    });
    if (created.count <= 0) return { date, count, saved: false };

    await context.audit.create([
      {
        type: AuditEventType.MCP_USAGE_COUNTED,
        data: {
          date: startOfCountedDay.toISOString(),
          count,
        },
        createdById: null,
      },
    ]);

    return { date, count, saved: true };
  });
