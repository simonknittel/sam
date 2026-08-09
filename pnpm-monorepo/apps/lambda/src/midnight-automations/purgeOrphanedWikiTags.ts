import { prisma } from "@sam-monorepo/database";
import { createAuditEvents } from "../common/audit";
import { log } from "../common/logger";
import { captureAsyncFunc } from "../common/xray";

/**
 * Deletes wiki tags that no page uses anymore. Unassigning normally deletes
 * a tag together with its last usage right away; this sweep covers orphans
 * left behind by permanent page deletion (the assignments cascade-delete
 * with the page, the tag itself stays).
 */
export const purgeOrphanedWikiTags = async () => {
  await captureAsyncFunc("purgeOrphanedWikiTags", async () => {
    const result = await prisma.wikiTag.deleteMany({
      where: { pages: { none: {} } },
    });

    if (result.count > 0) {
      log.info("Purged orphaned wiki tags", { count: result.count });

      await createAuditEvents([
        {
          type: "ORPHANED_WIKI_TAGS_PURGED",
          data: { count: result.count },
        },
      ]);
    }
  });
};
