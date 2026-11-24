import {
  AuditEventType,
  collectVisibleWikiSubtree,
  slugifyWikiPageTitle,
  type AuditEventInput,
} from "@sam-monorepo/domain";
import { compareWikiPagesByOrder } from "@sam-monorepo/wiki-editor/helpers";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { LONG_TRANSACTION_TIMEOUT_IN_MILLISECONDS } from "../eventTemplates/containerContentCopy.js";
import { WikiPageAccessTier } from "./getAccessibleWikiPage.js";
import type { WikiSharedContextPage } from "./wikiContext.js";
import { WikiErrorMessage } from "./wikiErrors.js";
import {
  copyWikiPagesIntoContainer,
  type CopiedWikiPage,
  type WikiPageCopyEntry,
} from "./wikiPageCopy.js";
import {
  getNextWikiPageSortOrder,
  getTopLevelWikiPagePermissions,
  INHERITED_WIKI_PAGE_PERMISSIONS,
} from "./wikiPageDefaults.js";
import {
  getWikiPageScopeContainer,
  requireWikiPageOfScope,
  type WikiPageScope,
} from "./wikiScope.js";

export enum WikiPageCopyDestinationKind {
  NewPage = "newPage",
  /**
   * Only the copied children are created, after the existing children of
   * the page. The page itself (its content and attributes) is the business
   * of the caller: the paste that replaces a page.
   */
  IntoExistingPage = "intoExistingPage",
}

type WikiPageCopyDestination =
  | {
      readonly kind: WikiPageCopyDestinationKind.NewPage;
      /** Undefined copies to the top level, which only the global wiki has */
      readonly parentId: string | undefined;
      readonly rootTitle: string;
    }
  | {
      readonly kind: WikiPageCopyDestinationKind.IntoExistingPage;
      readonly pageId: string;
    };

interface CopyWikiPageSubtreeOptions {
  readonly sourceScope: WikiPageScope;
  /** The caller checks that the actor can read it */
  readonly sourcePage: WikiSharedContextPage;
  /** Copy the subtree of the source that the actor can read */
  readonly includeChildren: boolean;
  /** Can be different from the scope of the source: copies are new rows */
  readonly targetScope: WikiPageScope;
  /** The caller checks that the actor can put pages there */
  readonly destination: WikiPageCopyDestination;
  /** The creator of the copies and the owner of a top-level copy */
  readonly createdByEntityId: string;
}

interface CopyWikiPageSubtreeResult {
  readonly root: { readonly id: string; readonly slug: string };
  /**
   * All created pages, the copied root first. For a copy into an existing
   * page, the root is that page, which this list does not contain.
   */
  readonly copiedPages: CopiedWikiPage[];
}

/** A copy needs only the read tier of its source */
export const requireWikiPageCopySource = async (
  context: ApplicationContext,
  actor: Actor,
  pageId: string,
): Promise<{
  readonly sourceScope: WikiPageScope;
  readonly sourcePage: WikiSharedContextPage;
}> => {
  const { scope, page } = await requireWikiPageOfScope(
    context,
    actor,
    pageId,
    WikiPageAccessTier.Read,
    { notFoundMessage: WikiErrorMessage.SourcePageNotFound },
  );

  return { sourceScope: scope, sourcePage: page };
};

interface WikiPageCopyPlacement {
  /** The parent of the copied root, or of the copied children */
  readonly rootParentId: string | null;
  /** The copy of the source page itself, or null for a copy into a page */
  readonly rootEntry: WikiPageCopyEntry | null;
  readonly existingPage: WikiSharedContextPage | null;
  /**
   * The sort order of the first copied child below the existing page. Null:
   * the children keep their sort order, because their parent is a new copy.
   */
  readonly firstChildSortOrder: number | null;
}

const resolveWikiPageCopyPlacement = ({
  sourcePage,
  targetScope,
  destination,
  createdByEntityId,
}: CopyWikiPageSubtreeOptions): WikiPageCopyPlacement => {
  switch (destination.kind) {
    case WikiPageCopyDestinationKind.NewPage: {
      const parentId = destination.parentId ?? null;
      if (parentId === null && getWikiPageScopeContainer(targetScope))
        throw new Error("Briefings have no top level to copy to");

      return {
        rootParentId: parentId,
        rootEntry: {
          source: sourcePage,
          title: destination.rootTitle,
          slug: slugifyWikiPageTitle(destination.rootTitle),
          parentSourceId: null,
          sortOrder: getNextWikiPageSortOrder(targetScope.pages, parentId),
          permissions:
            parentId === null
              ? getTopLevelWikiPagePermissions(createdByEntityId)
              : { ...INHERITED_WIKI_PAGE_PERMISSIONS, ownerId: null },
        },
        existingPage: null,
        firstChildSortOrder: null,
      };
    }

    case WikiPageCopyDestinationKind.IntoExistingPage: {
      const existingPage = targetScope.pagesById.get(destination.pageId);
      if (!existingPage)
        throw new Error("The destination page is missing from its scope");

      return {
        rootParentId: existingPage.id,
        rootEntry: null,
        existingPage,
        firstChildSortOrder: getNextWikiPageSortOrder(
          targetScope.pages,
          existingPage.id,
        ),
      };
    }

    default:
      throw new Error(
        `Unknown wiki page copy destination: ${destination satisfies never}`,
      );
  }
};

/**
 * Creates copies of a page at the destination, optionally with the subtree
 * that the actor can read. A page that the actor cannot read hides its full
 * subtree: the copy does not include it or a page below it. The destination
 * can be in a different scope than the source: a move cannot cross the
 * border of the namespace, but a copy can, because the copies are new rows
 * that take the namespace and the container of their new place.
 *
 * No copy takes the permissions of its source. Like a moved page, a copy
 * takes the permissions of its new place: all tiers are INHERIT (the scope
 * columns of a briefing keep their INHERIT defaults for the same reason),
 * and a copy at the top level gets the permissions of a new page at the top
 * level. Thus a copy can get a wider audience than its source. The placement
 * needs the admin tier of the target, thus the manager of the target
 * decides, and the dialogs tell it.
 */
export const copyWikiPageSubtree = async (
  context: Pick<ApplicationContext, "prisma">,
  options: CopyWikiPageSubtreeOptions,
): Promise<CopyWikiPageSubtreeResult> => {
  const { sourceScope, sourcePage, includeChildren, targetScope } = options;
  const { rootParentId, rootEntry, existingPage, firstChildSortOrder } =
    resolveWikiPageCopyPlacement(options);

  const subtree = includeChildren
    ? collectVisibleWikiSubtree<WikiSharedContextPage>(
        sourceScope.pages,
        sourcePage.id,
        (id) => sourceScope.permissions.get(id)?.canRead === true,
      )
    : [];

  const childSortOrders = new Map(
    firstChildSortOrder === null
      ? []
      : subtree
          .filter((entry) => entry.visibleParentId === sourcePage.id)
          .map((entry) => entry.page)
          .toSorted(compareWikiPagesByOrder)
          .map((page, index) => [page.id, firstChildSortOrder + index]),
  );

  /** Depth-first: the parents come before their children */
  const entries: WikiPageCopyEntry[] = [
    ...(rootEntry ? [rootEntry] : []),
    ...subtree.map(({ page, visibleParentId }) => ({
      source: page,
      title: page.title,
      slug: page.slug,
      parentSourceId: visibleParentId,
      sortOrder: childSortOrders.get(page.id) ?? page.sortOrder,
      permissions: { ...INHERITED_WIKI_PAGE_PERMISSIONS, ownerId: null },
    })),
  ];

  return context.prisma.$transaction(
    async (transaction) => {
      const { copiedPages, newIdBySourceId, slugBySourceId } =
        await copyWikiPagesIntoContainer(transaction, {
          entries,
          targetContainer: getWikiPageScopeContainer(targetScope),
          rootParentId,
          initialIdBySourceId: existingPage
            ? new Map([[sourcePage.id, existingPage.id]])
            : undefined,
          createdByEntityId: options.createdByEntityId,
        });

      const root = existingPage
        ? { id: existingPage.id, slug: existingPage.slug }
        : {
            id: newIdBySourceId.get(sourcePage.id)!,
            slug: slugBySourceId.get(sourcePage.id)!,
          };

      return { root, copiedPages };
    },
    { timeout: LONG_TRANSACTION_TIMEOUT_IN_MILLISECONDS },
  );
};

/**
 * @param eventId The event of the target briefing, or null
 * @param replacedPageId The existing page that took over the content of the
 * copied root (the paste that replaces a page)
 */
export const buildWikiPageCopiedAuditEvents = (
  copiedPages: readonly CopiedWikiPage[],
  rootPageId: string,
  eventId: string | null,
  createdById: string,
  replacedPageId?: string,
): AuditEventInput[] =>
  copiedPages.map((page) => ({
    type: AuditEventType.WIKI_PAGE_COPIED,
    data: {
      pageId: page.id,
      eventId: eventId ?? undefined,
      sourcePageId: page.sourcePageId,
      title: page.title,
      parentId: page.parentId,
      rootPageId,
      ...(page.id === replacedPageId ? { replacedExistingPage: true } : {}),
    },
    createdById,
  }));
