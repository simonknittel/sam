import { WikiPageNamespace, type Prisma } from "@sam-monorepo/database/client";
import type {
  EventContainer,
  EventContainerColumns,
} from "@sam-monorepo/domain";
import { compareWikiPagesByOrder } from "@sam-monorepo/wiki-editor/helpers";
import type { ApplicationContext } from "../context.js";
import {
  EVENT_WIKI_PAGE_SELECT,
  pickEventWikiRootPage,
  type EventWikiContextPage,
} from "./eventWikiContext.js";
import {
  copyWikiPagesIntoContainer,
  type WikiPageCopyEntry,
} from "./wikiPageCopy.js";
import { INHERITED_WIKI_PAGE_PERMISSIONS } from "./wikiPageDefaults.js";

/**
 * A container whose root was trashed has pages but nothing to copy. No
 * permission check: the caller checks the container.
 */
export const findBriefingCopySource = async (
  context: Pick<ApplicationContext, "prisma">,
  columns: EventContainerColumns,
): Promise<{
  readonly pages: EventWikiContextPage[];
  readonly rootPage: EventWikiContextPage | null;
}> => {
  const pages = await context.prisma.wikiPage.findMany({
    where: {
      namespace: WikiPageNamespace.EVENT,
      ...columns,
      deletedAt: null,
    },
    select: EVENT_WIKI_PAGE_SELECT,
  });

  return { pages, rootPage: pickEventWikiRootPage(pages) };
};

/** Depth-first, siblings in their rendered order — parents before children */
const orderDepthFirst = (
  pages: readonly EventWikiContextPage[],
): EventWikiContextPage[] => {
  const childrenByParentId = Map.groupBy(pages, (page) => page.parentId);

  const ordered: EventWikiContextPage[] = [];
  const visit = (parentId: string | null) => {
    for (const page of (childrenByParentId.get(parentId) ?? []).toSorted(
      compareWikiPagesByOrder,
    )) {
      ordered.push(page);
      visit(page.id);
    }
  };
  visit(null);

  return ordered;
};

interface CopyBriefingTreeParams {
  readonly sourcePages: readonly EventWikiContextPage[];
  readonly targetContainer: EventContainer;
  readonly createdByEntityId: string;
  /**
   * Old→new position id map of the lineup that was cloned alongside, so
   * position-scoped pages point at the copy's own positions.
   */
  readonly positionIdBySourceId: ReadonlyMap<string, string>;
}

/**
 * Copies a whole briefing — the blueprint of an event template into a new
 * event, an event's briefing into a new template, or one template's briefing
 * into its duplicate. Unlike the subtree copy this carries the pages' scopes
 * over: reproducing who will be able to read which page is the entire point
 * of a briefing blueprint.
 *
 * Runs on the caller's transaction, so the copied briefing commits together
 * with whatever it belongs to.
 */
export const copyBriefingTree = async (
  transaction: Prisma.TransactionClient,
  params: CopyBriefingTreeParams,
) => {
  const ordered = orderDepthFirst(params.sourcePages);

  const entries: WikiPageCopyEntry[] = ordered.map((page) => ({
    source: page,
    title: page.title,
    slug: page.slug,
    parentSourceId: page.parentId,
    sortOrder: page.sortOrder,
    /**
     * The pages of a briefing have no role-based tiers and no owner: the
     * managers of the container manage them (see WikiPage.ownerId)
     */
    permissions: { ...INHERITED_WIKI_PAGE_PERMISSIONS, ownerId: null },
  }));

  const { copiedPages } = await copyWikiPagesIntoContainer(transaction, {
    entries,
    targetContainer: params.targetContainer,
    rootParentId: null,
    createdByEntityId: params.createdByEntityId,
    carryBriefingScopes: {
      positionIdBySourceId: params.positionIdBySourceId,
    },
  });

  return { pageCount: copiedPages.length };
};
