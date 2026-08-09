import { prisma } from "@/db";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { authenticate } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { getUnseenChangelogEntryKeys } from "./getUnseenChangelogEntryKeys";

export const updateUnseenChangelogEntries = withTrace(
  "updateUnseenChangelogEntries",
  async () => {
    const authentication = await authenticate();
    if (!authentication || !authentication?.session?.entity)
      return new Set<string>();

    const unseenKeys = await getUnseenChangelogEntryKeys();
    if (unseenKeys.size <= 0) return new Set<string>();

    try {
      const { count } = await prisma.changelogEntrySeen.createMany({
        data: Array.from(unseenKeys.values()).map((key) => ({
          citizenId: authentication.session.entity!.id,
          key,
        })),
        skipDuplicates: true,
      });

      if (count > 0)
        await createAuditEvents([
          {
            type: AuditEventType.CHANGELOG_ENTRIES_SEEN,
            data: {
              citizenId: authentication.session.entity.id,
              count,
            },
            createdById: authentication.session.user.id,
          },
        ]);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      /** Graceful degradation - entries may show as new again on next load */
    }

    return unseenKeys;
  },
);
