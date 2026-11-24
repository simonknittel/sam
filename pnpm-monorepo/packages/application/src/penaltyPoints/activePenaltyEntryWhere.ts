import type { Prisma } from "@sam-monorepo/database/client";

/**
 * The penalty entries that still count against a citizen: not deleted and
 * not expired. An entry without an expiry date never expires. The list of the
 * active entries and the sum of the penalty points use this rule.
 */
export const buildActivePenaltyEntryWhere = (
  now: Date,
): Prisma.PenaltyEntryWhereInput => ({
  deletedAt: null,
  OR: [{ expiresAt: { gte: now } }, { expiresAt: null }],
});
