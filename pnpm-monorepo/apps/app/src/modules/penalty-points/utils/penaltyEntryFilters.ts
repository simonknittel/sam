import type { Prisma } from "@sam-monorepo/database/client";

/**
 * The penalty entries which still count against a citizen: neither deleted
 * nor expired. An entry without an expiry date never expires. Every surface
 * which shows or sums penalty points uses this rule, thus it lives here and
 * not in each query.
 */
export const buildActivePenaltyEntryWhere =
  (): Prisma.PenaltyEntryWhereInput => ({
    deletedAt: null,
    OR: [{ expiresAt: { gte: new Date() } }, { expiresAt: null }],
  });
