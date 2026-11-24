import type { ApplicationContext } from "../context.js";
import { WikiPageAccessTier } from "./getAccessibleWikiPage.js";
import { requireAccessibleWikiPage, type WikiScope } from "./wikiScope.js";

export const findWikiPageTags = async (
  context: Pick<ApplicationContext, "prisma">,
  scope: WikiScope,
  pageId: string,
): Promise<{ readonly id: string; readonly name: string }[]> => {
  requireAccessibleWikiPage(scope, pageId, WikiPageAccessTier.Read);

  const assignments = await context.prisma.wikiPageTag.findMany({
    where: { pageId },
    select: { tag: { select: { id: true, name: true } } },
    orderBy: { tag: { name: "asc" } },
  });

  return assignments.map(({ tag }) => ({ id: tag.id, name: tag.name }));
};
