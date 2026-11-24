import { wikiContainerColumns } from "@sam-monorepo/domain";
import { buildWikiPageHref } from "@sam-monorepo/wiki-editor/helpers";
import type { ApplicationContext } from "../context.js";
import {
  getAccessibleWikiPage,
  WikiPageAccessTier,
} from "./getAccessibleWikiPage.js";
import { buildVisibleWikiBreadcrumb } from "./wikiBreadcrumb.js";
import {
  getWikiPageScopeContainer,
  isHiddenBriefing,
  type WikiPageScope,
} from "./wikiScope.js";

export interface WikiTagPage {
  readonly href: string;
  readonly title: string;
  readonly iconId: string | null;
  readonly breadcrumb: string[];
}

export interface WikiTagPages {
  readonly name: string;
  readonly pages: WikiTagPage[];
}

/**
 * The name of the tag has no gate (the autocomplete also shows it), but the
 * list of the pages has one
 */
export const findWikiTagPages = async (
  context: Pick<ApplicationContext, "prisma">,
  scope: WikiPageScope,
  tagId: string,
): Promise<WikiTagPages | null> => {
  if (isHiddenBriefing(scope)) return null;

  const tag = await context.prisma.wikiTag.findFirst({
    /** A global tag has no container: both container columns are null */
    where: {
      id: tagId,
      ...wikiContainerColumns(getWikiPageScopeContainer(scope)),
    },
    select: { name: true, pages: { select: { pageId: true } } },
  });
  if (!tag) return null;

  const pages = tag.pages
    .map((assignment) =>
      getAccessibleWikiPage(scope, assignment.pageId, WikiPageAccessTier.Read),
    )
    .filter((page) => page !== null)
    .toSorted((first, second) => first.title.localeCompare(second.title))
    .map((page) => ({
      href: buildWikiPageHref(scope.hrefBase, page),
      title: page.title,
      iconId: page.iconId,
      breadcrumb: buildVisibleWikiBreadcrumb(scope, page),
    }));

  return { name: tag.name, pages };
};
