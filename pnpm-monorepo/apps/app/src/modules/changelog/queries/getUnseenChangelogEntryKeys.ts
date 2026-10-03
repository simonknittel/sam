import { prisma } from "@/db";
import { authenticate } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { getLocalDateKey, ORGANIZATION_TIMEZONE } from "@sam-monorepo/domain";
import { cache } from "react";
import { CHANGELOG_ENTRIES } from "../entries";

/**
 * Entries published before a citizen joined are not new to them, so only
 * entries of the confirmation day itself and later are tracked. Citizens
 * without a confirmed email (admins bypassing the confirmation) have no
 * cutoff and see every tracked entry as new.
 */
const getTrackedKeysSince = (emailVerified: Date | null) => {
  const cutoffDate = emailVerified
    ? getLocalDateKey(emailVerified, ORGANIZATION_TIMEZONE)
    : null;

  return CHANGELOG_ENTRIES.filter(
    (entry) => entry.isTracked && (!cutoffDate || entry.date >= cutoffDate),
  ).map((entry) => entry.key);
};

export const getUnseenChangelogEntryKeys = cache(
  withTrace("getUnseenChangelogEntryKeys", async () => {
    const authentication = await authenticate();
    if (!authentication || !authentication?.session?.entity)
      return new Set<string>();

    const trackedKeys = getTrackedKeysSince(
      authentication.session.user.emailVerified,
    );

    if (trackedKeys.length <= 0) return new Set<string>();

    const seenEntries = await prisma.changelogEntrySeen.findMany({
      where: {
        citizenId: authentication.session.entity.id,
        key: {
          in: trackedKeys,
        },
      },
      select: {
        key: true,
      },
    });

    const seenKeys = new Set(seenEntries.map((seenEntry) => seenEntry.key));
    return new Set(trackedKeys).difference(seenKeys);
  }),
);
