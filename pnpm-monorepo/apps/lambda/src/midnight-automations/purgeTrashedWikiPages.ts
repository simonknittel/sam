import { prisma } from "@sam-monorepo/database";
import { AuditEventType } from "@sam-monorepo/domain";
import { createAuditEvents } from "../common/audit";
import { log } from "../common/logger";
import { captureAsyncFunc } from "../common/xray";

const RETENTION_DAYS = 30;

/**
 * Permanently deletes wiki pages that have been in the trash for more than
 * 30 days. The parentId FK is Restrict, so pages are deleted leaves-first:
 * repeatedly delete expired pages without remaining children until nothing
 * is left. Children are always soft-deleted together with (or before) their
 * ancestors, so an expired parent can't have a non-expired child.
 */
export const purgeTrashedWikiPages = async () => {
  await captureAsyncFunc("purgeTrashedWikiPages", async () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

    let totalDeleted = 0;

    for (;;) {
      const deletable = await prisma.wikiPage.findMany({
        where: {
          deletedAt: { lt: cutoff },
          children: { none: {} },
        },
        select: { id: true },
      });

      if (deletable.length <= 0) break;

      const result = await prisma.wikiPage.deleteMany({
        where: { id: { in: deletable.map((page) => page.id) } },
      });
      totalDeleted += result.count;
    }

    if (totalDeleted > 0) {
      log.info("Purged trashed wiki pages", { count: totalDeleted });

      await createAuditEvents([
        {
          type: AuditEventType.TRASHED_WIKI_PAGES_PURGED,
          data: { count: totalDeleted },
        },
      ]);
    }
  });
};
