import { prisma } from "@/db";
import { authenticate } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { getUnseenChangelogEntryKeys } from "./getUnseenChangelogEntryKeys";

export interface TrackableEntry {
  key: string;
}

export const updateUnseenChangelogEntries = withTrace(
  "updateUnseenChangelogEntries",
  async () => {
    const authentication = await authenticate();
    if (!authentication || !authentication?.session?.entity)
      return new Set<string>();

    const unseenKeys = await getUnseenChangelogEntryKeys();
    if (unseenKeys.size <= 0) return new Set<string>();

    try {
      await prisma.changelogEntrySeen.createMany({
        data: Array.from(unseenKeys.values()).map((key) => ({
          citizenId: authentication.session.entity!.id,
          key,
        })),
        skipDuplicates: true,
      });
    } catch (error) {
      /** Graceful degradation - entries may show as new again on next load */
    }

    return unseenKeys;
  },
);
