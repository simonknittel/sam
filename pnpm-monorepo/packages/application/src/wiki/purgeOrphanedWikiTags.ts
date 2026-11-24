import { AuditEventType } from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";

export interface PurgeOrphanedWikiTagsOutput {
  readonly purgedTagCount: number;
}

/**
 * A page that loses its last use of a tag normally deletes the tag in the same
 * request. This sweep deletes the orphans that a permanent page deletion
 * leaves behind: the assignments cascade with the page, but the tag stays.
 */
export const purgeOrphanedWikiTags = (
  context: ApplicationContext,
): Promise<PurgeOrphanedWikiTagsOutput> =>
  withSpan(context, "purgeOrphanedWikiTags", async () => {
    const { count: purgedTagCount } = await context.prisma.wikiTag.deleteMany({
      where: { pages: { none: {} } },
    });

    if (purgedTagCount > 0) {
      await context.audit.create([
        {
          type: AuditEventType.ORPHANED_WIKI_TAGS_PURGED,
          data: { count: purgedTagCount },
          createdById: null,
        },
      ]);
    }

    return { purgedTagCount };
  });
