import { prisma } from "@/db";
import { authenticate } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";
import { getChangelogTrackedKeys } from "./getChangelogTrackedKeys";

export const getUnseenChangelogEntryKeys = cache(
  withTrace("getUnseenChangelogEntryKeys", async () => {
    const authentication = await authenticate();
    if (!authentication || !authentication?.session?.entity)
      return new Set<string>();

    const trackedKeys = await getChangelogTrackedKeys();

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
