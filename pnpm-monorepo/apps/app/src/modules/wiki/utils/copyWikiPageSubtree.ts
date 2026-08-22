import { prisma } from "@/db";
import {
  eventContainerColumns,
  type EventContainer,
} from "@/modules/events/utils/eventContainer";
import {
  WikiPageEditability,
  WikiPageEventScope,
  WikiPageNamespace,
  WikiPageUploadability,
  WikiPageVisibility,
  type Prisma,
} from "@sam-monorepo/database/client";
import type { WikiSharedContextPage } from "../queries/getWikiContext";
import type { WikiPageScopedContext } from "../queries/getWikiPageScopedContext";
import { collectVisibleWikiSubtree } from "./collectVisibleWikiSubtree";
import { compareWikiPagesByOrder } from "./compareWikiPagesByOrder";
import { findOrCreateWikiTags } from "./findOrCreateWikiTags";
import { slugifyWikiPageTitle } from "./slugifyWikiPageTitle";
import { WikiScope } from "./wikiPageHref";

const TRANSACTION_TIMEOUT_MS = 30_000;

type CopyWikiPageDestination =
  | {
      /** The copied root becomes a new page underneath parentId */
      readonly kind: "newPage";
      /** Undefined copies to the top level, which only exists in the global wiki */
      readonly parentId: string | undefined;
      readonly rootTitle: string;
    }
  | {
      /**
       * Only the copied children are created, appended after the existing
       * children of this page. The page itself (content, attributes) is the
       * caller's business — used by the paste action's replace mode.
       */
      readonly kind: "intoExistingPage";
      readonly pageId: string;
    };

interface CopyWikiPageSubtreeOptions {
  readonly sourceScoped: WikiPageScopedContext;
  /** Must be readable by the viewer — callers check */
  readonly sourcePage: WikiSharedContextPage;
  /** Copy the source's readable subtree along with it */
  readonly includeChildren: boolean;
  /** May differ from the source's scope: copies are new rows */
  readonly targetScoped: WikiPageScopedContext;
  /** Must be an allowed placement in the target scope — callers check */
  readonly destination: CopyWikiPageDestination;
  /** Creator of the copies; becomes the owner of a top-level copy */
  readonly createdByEntityId: string;
}

export interface CopiedWikiPage {
  readonly id: string;
  readonly sourcePageId: string;
  readonly title: string;
  readonly parentId: string | null;
}

interface CopyWikiPageSubtreeResult {
  readonly root: { readonly id: string; readonly slug: string };
  /**
   * All created pages, the copied root first — which for an
   * intoExistingPage destination is not part of this list.
   */
  readonly copiedPages: CopiedWikiPage[];
}

interface CopyPermissionColumns {
  readonly visibility: WikiPageVisibility;
  readonly editability: WikiPageEditability;
  readonly imageUploadability: WikiPageUploadability;
  readonly attachmentUploadability: WikiPageUploadability;
  readonly ownerId: string | null;
}

/** One page to create, in depth-first order (parents before their children) */
export interface WikiPageCopyEntry {
  readonly source: WikiSharedContextPage;
  readonly title: string;
  readonly slug: string;
  /**
   * Source id of the page whose copy becomes the parent. NULL places the
   * copy directly under `rootParentId`.
   */
  readonly parentSourceId: string | null;
  readonly sortOrder: number;
  readonly permissions: CopyPermissionColumns;
}

interface CopyWikiPagesParams {
  readonly entries: readonly WikiPageCopyEntry[];
  /** NULL copies into the global wiki */
  readonly targetContainer: EventContainer | null;
  /** Parent of the entries without a `parentSourceId` */
  readonly rootParentId: string | null;
  /**
   * Source id → already existing target id, for entries whose parent is not
   * itself part of this copy (the replace-paste's destination page).
   */
  readonly initialIdBySourceId?: ReadonlyMap<string, string>;
  readonly createdByEntityId: string;
  /**
   * Carries the source pages' briefing scopes and upload tiers over instead
   * of resetting them to INHERIT, remapping POSITION references through this
   * map. Used when an event is seeded from a template, where those scopes
   * are the point of the blueprint; a reference that is not in the map
   * degrades to managers-only, which is how a dangling POSITION scope
   * behaves anyway.
   */
  readonly carryBriefingScopes?: {
    readonly positionIdBySourceId: ReadonlyMap<string, string>;
  };
}

interface CopyWikiPagesResult {
  readonly copiedPages: CopiedWikiPage[];
  readonly newIdBySourceId: Map<string, string>;
  /** Slug of each copy, keyed by source id */
  readonly slugBySourceId: Map<string, string>;
}

const INHERITED_PERMISSIONS: CopyPermissionColumns = {
  visibility: WikiPageVisibility.INHERIT,
  editability: WikiPageEditability.INHERIT,
  imageUploadability: WikiPageUploadability.INHERIT,
  attachmentUploadability: WikiPageUploadability.INHERIT,
  ownerId: null,
};

/**
 * Remaps one page's POSITION scope references onto the copied lineup. A
 * scope that is not POSITION never carries a meaningful reference, and an
 * unmapped position falls back to NULL — the same fail-closed degradation a
 * deleted position causes (see WikiPage.eventReadScopePosition).
 */
export const remapBriefingScopePositions = (
  page: {
    readonly eventReadScope: WikiPageEventScope;
    readonly eventReadScopePositionId: string | null;
    readonly eventEditScope: WikiPageEventScope;
    readonly eventEditScopePositionId: string | null;
  },
  positionIdBySourceId: ReadonlyMap<string, string>,
) => {
  const remap = (scope: WikiPageEventScope, positionId: string | null) =>
    scope === WikiPageEventScope.POSITION && positionId
      ? (positionIdBySourceId.get(positionId) ?? null)
      : null;

  return {
    eventReadScope: page.eventReadScope,
    eventReadScopePositionId: remap(
      page.eventReadScope,
      page.eventReadScopePositionId,
    ),
    eventEditScope: page.eventEditScope,
    eventEditScopePositionId: remap(
      page.eventEditScope,
      page.eventEditScopePositionId,
    ),
  };
};

/**
 * Creates the given pages inside the target container, on the caller's
 * transaction. The shared core of every wiki copy: the subtree copy below
 * and the briefing seeding of an event created from a template.
 *
 * Content (including the Yjs document) is copied from the last persisted
 * state — unsaved changes of a live collab session are not included. Images
 * and attachments keep referencing the source pages' uploads; each copy is
 * linked to its source page's uploads (Upload.wikiPages) so attachment
 * downloads are permission-checked against the copy itself. Tags carry over
 * by name: found-or-created case-insensitively in the target scope (like
 * updateWikiPageTags), which links the identical tag on a same-scope copy
 * and recreates it on a cross-scope one.
 */
export const copyWikiPagesIntoContainer = async (
  transaction: Prisma.TransactionClient,
  params: CopyWikiPagesParams,
): Promise<CopyWikiPagesResult> => {
  const sourcePageIds = params.entries.map((entry) => entry.source.id);

  const [contentRows, tagAssignments] = await Promise.all([
    transaction.wikiPage.findMany({
      where: { id: { in: sourcePageIds } },
      select: {
        id: true,
        content: true,
        searchText: true,
        ydoc: true,
        eventReadScope: true,
        eventReadScopePositionId: true,
        eventEditScope: true,
        eventEditScopePositionId: true,
        attachments: { select: { id: true } },
      },
    }),
    transaction.wikiPageTag.findMany({
      where: { pageId: { in: sourcePageIds } },
      select: { pageId: true, tag: { select: { name: true } } },
    }),
  ]);
  const contentById = new Map(contentRows.map((row) => [row.id, row]));
  const tagNamesByPageId = new Map<string, string[]>();
  for (const assignment of tagAssignments) {
    const names = tagNamesByPageId.get(assignment.pageId) ?? [];
    names.push(assignment.tag.name);
    tagNamesByPageId.set(assignment.pageId, names);
  }

  /** Copies land in the target's scope, wherever the source came from */
  const scopeColumns = params.targetContainer
    ? {
        namespace: WikiPageNamespace.EVENT,
        ...eventContainerColumns(params.targetContainer),
      }
    : {
        namespace: WikiPageNamespace.WIKI,
        eventId: null,
        templateId: null,
      };

  const tagsByLower = await findOrCreateWikiTags(
    transaction,
    [...tagNamesByPageId.values()].flat(),
    params.targetContainer,
    params.createdByEntityId,
  );

  const tagsOf = (sourcePageId: string) => {
    const tags = (tagNamesByPageId.get(sourcePageId) ?? []).map((name) =>
      tagsByLower.get(name.toLocaleLowerCase())!,
    );
    return {
      tagIds: tags.map((tag) => tag.id),
      /** Denormalized for the full-text search (see WikiPage.tagsText) */
      tagsText: tags
        .map((tag) => tag.name)
        .toSorted((first, second) => first.localeCompare(second))
        .join(" "),
    };
  };

  const newIdBySourceId = new Map(params.initialIdBySourceId ?? []);
  const slugBySourceId = new Map<string, string>();
  const copiedPages: CopiedWikiPage[] = [];

  for (const entry of params.entries) {
    const parentId = entry.parentSourceId
      ? (newIdBySourceId.get(entry.parentSourceId) ?? null)
      : params.rootParentId;
    const content = contentById.get(entry.source.id);
    const { tagIds, tagsText } = tagsOf(entry.source.id);

    const copy = await transaction.wikiPage.create({
      data: {
        title: entry.title,
        slug: entry.slug,
        parentId,
        ...scopeColumns,
        sortOrder: entry.sortOrder,
        sidebarMode: entry.source.sidebarMode,
        iconId: entry.source.iconId,
        content: content?.content ?? undefined,
        searchText: content?.searchText ?? "",
        tagsText,
        ydoc: content?.ydoc ?? undefined,
        attachments:
          content && content.attachments.length > 0
            ? { connect: content.attachments.map(({ id }) => ({ id })) }
            : undefined,
        tags:
          tagIds.length > 0
            ? {
                createMany: {
                  data: tagIds.map((tagId) => ({
                    tagId,
                    createdById: params.createdByEntityId,
                  })),
                },
              }
            : undefined,
        ...entry.permissions,
        ...(params.carryBriefingScopes && content
          ? {
              ...remapBriefingScopePositions(
                content,
                params.carryBriefingScopes.positionIdBySourceId,
              ),
              imageUploadability: entry.source.imageUploadability,
              attachmentUploadability: entry.source.attachmentUploadability,
            }
          : {}),
        createdById: params.createdByEntityId,
      },
      select: { id: true, slug: true },
    });

    newIdBySourceId.set(entry.source.id, copy.id);
    slugBySourceId.set(entry.source.id, copy.slug);
    copiedPages.push({
      id: copy.id,
      sourcePageId: entry.source.id,
      title: entry.title,
      parentId,
    });
  }

  return { copiedPages, newIdBySourceId, slugBySourceId };
};

/**
 * Creates copies of a page — optionally with the subtree the viewer can see
 * (an unreadable page hides its whole subtree, so neither it nor anything
 * below it is copied) — at the destination, which may live in a different
 * scope than the source: unlike moving, copying may cross the namespace
 * boundary because the copies are new rows that take namespace and
 * container from their new place.
 *
 * No copy carries the source's permissions over: like a moved page they
 * take the permissions of their new place, so all tiers are INHERIT (the
 * briefing scope columns keep their INHERIT defaults for the same reason)
 * and a top-level copy gets the defaults of a newly created top-level page.
 * A copy can thereby reach a wider audience than its source. Placing it
 * takes managing the target, so that is the target's manager to decide,
 * and the dialogs say so.
 */
export const copyWikiPageSubtree = async (
  options: CopyWikiPageSubtreeOptions,
): Promise<CopyWikiPageSubtreeResult> => {
  const { sourcePage, targetScoped, destination } = options;
  const sourceContext = options.sourceScoped.context;
  const targetContext = targetScoped.context;
  const targetContainer: EventContainer | null =
    targetScoped.scope === WikiScope.Event
      ? targetScoped.context.container
      : null;
  if (
    destination.kind === "newPage" &&
    !destination.parentId &&
    targetContainer
  )
    throw new Error("Briefings have no top level to copy to");

  const subtree = options.includeChildren
    ? collectVisibleWikiSubtree<WikiSharedContextPage>(
        sourceContext.pages,
        sourcePage.id,
        (id) => sourceContext.permissions.get(id)?.canRead === true,
      )
    : [];

  /**
   * New pages append after the existing children of their landing spot:
   * the copied root after the parent's children, or — into an existing
   * page — the copied top-level children after that page's own. Deeper
   * copies keep their source sortOrder (their parent is a fresh copy).
   */
  const appendUnderId =
    destination.kind === "newPage"
      ? (destination.parentId ?? null)
      : destination.pageId;
  const existingChildren = targetContext.pages.filter(
    (page) => page.parentId === appendUnderId,
  );
  const appendBase =
    existingChildren.length > 0
      ? Math.max(...existingChildren.map((page) => page.sortOrder)) + 1
      : 0;
  const rebasedSortOrders = new Map<string, number>();
  if (destination.kind === "intoExistingPage") {
    const directChildren = subtree
      .filter((entry) => entry.visibleParentId === sourcePage.id)
      .map((entry) => entry.page)
      .toSorted(compareWikiPagesByOrder);
    directChildren.forEach((page, index) =>
      rebasedSortOrders.set(page.id, appendBase + index),
    );
  }

  const rootPermissions: CopyPermissionColumns =
    destination.kind === "newPage" && !destination.parentId
      ? {
          visibility: WikiPageVisibility.RESTRICTED,
          editability: WikiPageEditability.RESTRICTED,
          imageUploadability: WikiPageUploadability.RESTRICTED,
          attachmentUploadability: WikiPageUploadability.RESTRICTED,
          ownerId: options.createdByEntityId,
        }
      : INHERITED_PERMISSIONS;

  /**
   * The existing page a replace-paste copies into. Its children get created
   * underneath it, the page itself is left to the caller.
   */
  const destinationPage =
    destination.kind === "intoExistingPage"
      ? targetContext.pagesById.get(destination.pageId)
      : undefined;
  if (destination.kind === "intoExistingPage" && !destinationPage)
    throw new Error("Destination page is missing from the context");

  const entries: WikiPageCopyEntry[] =
    destination.kind === "newPage"
      ? [
          {
            source: sourcePage,
            title: destination.rootTitle,
            slug: slugifyWikiPageTitle(destination.rootTitle),
            parentSourceId: null,
            sortOrder: appendBase,
            permissions: rootPermissions,
          },
        ]
      : [];

  /** Subtree entries are depth-first: parents always precede children */
  for (const { page, visibleParentId } of subtree)
    entries.push({
      source: page,
      title: page.title,
      slug: page.slug,
      parentSourceId: visibleParentId,
      sortOrder: rebasedSortOrders.get(page.id) ?? page.sortOrder,
      permissions: INHERITED_PERMISSIONS,
    });

  return await prisma.$transaction(
    async (transaction) => {
      const { copiedPages, newIdBySourceId, slugBySourceId } =
        await copyWikiPagesIntoContainer(transaction, {
          entries,
          targetContainer,
          rootParentId: appendUnderId,
          initialIdBySourceId: destinationPage
            ? new Map([[sourcePage.id, destinationPage.id]])
            : undefined,
          createdByEntityId: options.createdByEntityId,
        });

      const root = destinationPage
        ? { id: destinationPage.id, slug: destinationPage.slug }
        : {
            id: newIdBySourceId.get(sourcePage.id)!,
            slug: slugBySourceId.get(sourcePage.id)!,
          };

      return { root, copiedPages };
    },
    { timeout: TRANSACTION_TIMEOUT_MS },
  );
};
