import { prisma } from "@/db";
import { authenticate } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";
import { ALL_TRACKABLE_ENTRIES } from "../ALL_TRACKABLE_ENTRIES";

export const getUnseenChangelogEntryKeys = cache(
  withTrace("getUnseenChangelogEntryKeys", async () => {
    const authentication = await authenticate();
    if (!authentication || !authentication?.session?.entity)
      return new Set<string>();

    if (ALL_TRACKABLE_ENTRIES.length <= 0) return new Set<string>();

    const seenEntries = await prisma.changelogEntrySeen.findMany({
      where: {
        citizenId: authentication.session.entity.id,
        key: {
          in: ALL_TRACKABLE_ENTRIES as unknown as string[],
        },
      },
      select: {
        key: true,
      },
    });

    const seenKeys = new Set(seenEntries.map((seenEntry) => seenEntry.key));
    return new Set(ALL_TRACKABLE_ENTRIES.filter((key) => !seenKeys.has(key)));
  }),
);
