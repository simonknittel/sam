import type { Prisma } from "@sam-monorepo/database/client";

/**
 * An entry still counts at the time of its expiry. The list of the active
 * entries and the sum of the penalty points use this rule.
 */
export const buildActivePenaltyEntryWhere = (
  now: Date,
): Prisma.PenaltyEntryWhereInput => ({
  deletedAt: null,
  OR: [{ expiresAt: { gte: now } }, { expiresAt: null }],
});
