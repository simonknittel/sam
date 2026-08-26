import { prisma } from "@/db";
import { authenticate } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { formatInTimeZone } from "date-fns-tz";
import { cache } from "react";
import { CHANGELOG_ENTRIES } from "../entries";

/** The zone the changelog renders its dates in (see the quarter page) */
const DISPLAY_TIME_ZONE = "Europe/Berlin";

/**
 * Entries published before a citizen joined are not new to them, so only
 * entries of the confirmation day itself and later are tracked. Citizens
 * without a confirmed email (admins bypassing the confirmation) have no
 * cutoff and see every tracked entry as new.
 */
const getTrackedKeysSince = (emailVerified: Date | null) => {
  const cutoffDate = emailVerified
    ? formatInTimeZone(emailVerified, DISPLAY_TIME_ZONE, "yyyy-MM-dd")
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
    return new Set(trackedKeys.filter((key) => !seenKeys.has(key)));
  }),
);
