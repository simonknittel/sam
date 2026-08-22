import type { EventContainer } from "@/modules/events/utils/eventContainer";
import {
  WikiPageEditability,
  WikiPageUploadability,
  WikiPageVisibility,
  type Prisma,
} from "@sam-monorepo/database/client";
import type { EventWikiContextPage } from "../queries/getEventWikiContext";
import { compareWikiPagesByOrder } from "./compareWikiPagesByOrder";
import {
  copyWikiPagesIntoContainer,
  type WikiPageCopyEntry,
} from "./copyWikiPageSubtree";

/**
 * Briefing pages carry no role-based tiers — the container's manage set
 * replaces the owner concept (see WikiPage.ownerId).
 */
const BRIEFING_PERMISSIONS = {
  visibility: WikiPageVisibility.INHERIT,
  editability: WikiPageEditability.INHERIT,
  imageUploadability: WikiPageUploadability.INHERIT,
  attachmentUploadability: WikiPageUploadability.INHERIT,
  ownerId: null,
} as const;

/** Depth-first, siblings in their rendered order — parents before children */
const orderDepthFirst = (
  pages: readonly EventWikiContextPage[],
): EventWikiContextPage[] => {
  const childrenByParentId = new Map<string | null, EventWikiContextPage[]>();
  for (const page of pages) {
    const siblings = childrenByParentId.get(page.parentId) ?? [];
    siblings.push(page);
    childrenByParentId.set(page.parentId, siblings);
  }

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
  /** The source container's non-deleted pages, root included */
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
 * event, or one template's briefing into its duplicate. Unlike the
 * subtree copy this carries the pages' scopes over: reproducing who will be
 * able to read which page is the entire point of a briefing blueprint.
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
    permissions: BRIEFING_PERMISSIONS,
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
