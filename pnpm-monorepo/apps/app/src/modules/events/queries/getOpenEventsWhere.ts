import type { Prisma } from "@sam-monorepo/database/client";

/** Events that have not ended at `now` — the filter behind the "open" status */
export const getOpenEventsWhere = (now: Date): Prisma.EventWhereInput => ({
  OR: [{ startTime: { gte: now } }, { endTime: { gte: now } }],
});
