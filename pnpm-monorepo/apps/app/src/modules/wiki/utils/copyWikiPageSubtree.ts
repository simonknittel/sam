import { prisma } from "@/db";
import {
  WikiPageEditability,
  WikiPageNamespace,
  WikiPageUploadability,
  WikiPageVisibility,
} from "@sam-monorepo/database/client";
import type { WikiSharedContextPage } from "../queries/getWikiContext";
import type { WikiPageScopedContext } from "../queries/getWikiPageScopedContext";
import { collectVisibleWikiSubtree } from "./collectVisibleWikiSubtree";
import { compareWikiPagesByOrder } from "./compareWikiPagesByOrder";
import { findOrCreateWikiTags } from "./findOrCreateWikiTags";
import { slugifyWikiPageTitle } from "./slugifyWikiPageTitle";
import { WikiScope } from "./wikiPageHref";

const TRANSACTION_TIMEOUT_MS = 30_000;

export type CopyWikiPageDestination =
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

/**
 * Creates copies of a page — optionally with the subtree the viewer can see
 * (an unreadable page hides its whole subtree, so neither it nor anything
 * below it is copied) — at the destination, which may live in a different
 * scope than the source: unlike moving, copying may cross the namespace
 * boundary because the copies are new rows that take namespace and event
 * from their new place.
 *
 * Content (including the Yjs document) is copied from the last persisted
 * state — unsaved changes of a live collab session are not included. Images
 * and attachments keep referencing the source pages' uploads; each copy is
 * linked to its source page's uploads (Upload.wikiPages) so attachment
 * downloads are permission-checked against the copy itself. Tags carry over
 * by name: found-or-created case-insensitively in the target scope (like
 * updateWikiPageTags), which links the identical tag on a same-scope copy
 * and recreates it on a cross-scope one.
 *
 * No copy carries the source's permissions over: like a moved page they
 * take the permissions of their new place, so all tiers are INHERIT (the
 * event scope columns keep their INHERIT defaults for the same reason) and
 * a top-level copy gets the defaults of a newly created top-level page.
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
  const targetEventId =
    targetScoped.scope === WikiScope.Event
      ? targetScoped.context.event.id
      : null;
  if (destination.kind === "newPage" && !destination.parentId && targetEventId)
    throw new Error("Event wikis have no top level to copy to");

  const subtree = options.includeChildren
    ? collectVisibleWikiSubtree<WikiSharedContextPage>(
        sourceContext.pages,
        sourcePage.id,
        (id) => sourceContext.permissions.get(id)?.canRead === true,
      )
    : [];
  const sourcePageIds = [
    sourcePage.id,
    ...subtree.map((entry) => entry.page.id),
  ];

  const [contentRows, tagAssignments] = await Promise.all([
    prisma.wikiPage.findMany({
      where: { id: { in: sourcePageIds } },
      select: {
        id: true,
        content: true,
        searchText: true,
        ydoc: true,
        attachments: { select: { id: true } },
      },
    }),
    prisma.wikiPageTag.findMany({
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
      : {
          visibility: WikiPageVisibility.INHERIT,
          editability: WikiPageEditability.INHERIT,
          imageUploadability: WikiPageUploadability.INHERIT,
          attachmentUploadability: WikiPageUploadability.INHERIT,
          ownerId: null,
        };
  const inheritedPermissions: CopyPermissionColumns = {
    visibility: WikiPageVisibility.INHERIT,
    editability: WikiPageEditability.INHERIT,
    imageUploadability: WikiPageUploadability.INHERIT,
    attachmentUploadability: WikiPageUploadability.INHERIT,
    ownerId: null,
  };

  /** Copies land in the target's scope, wherever the source came from */
  const scopeColumns = {
    namespace: targetEventId ? WikiPageNamespace.EVENT : WikiPageNamespace.WIKI,
    eventId: targetEventId,
  };

  return await prisma.$transaction(
    async (transaction) => {
      const tagsByLower = await findOrCreateWikiTags(
        transaction,
        [...tagNamesByPageId.values()].flat(),
        targetEventId,
        options.createdByEntityId,
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

      const createCopy = async (
        source: WikiSharedContextPage,
        overrides: {
          title: string;
          slug: string;
          parentId: string | null;
          sortOrder: number;
          permissions: CopyPermissionColumns;
        },
      ) => {
        const content = contentById.get(source.id);
        const { tagIds, tagsText } = tagsOf(source.id);
        return await transaction.wikiPage.create({
          data: {
            title: overrides.title,
            slug: overrides.slug,
            parentId: overrides.parentId,
            ...scopeColumns,
            sortOrder: overrides.sortOrder,
            sidebarMode: source.sidebarMode,
            iconId: source.iconId,
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
                        createdById: options.createdByEntityId,
                      })),
                    },
                  }
                : undefined,
            ...overrides.permissions,
            createdById: options.createdByEntityId,
          },
          select: { id: true, slug: true },
        });
      };

      const copiedPages: CopiedWikiPage[] = [];
      let root: { id: string; slug: string };

      if (destination.kind === "newPage") {
        root = await createCopy(sourcePage, {
          title: destination.rootTitle,
          slug: slugifyWikiPageTitle(destination.rootTitle),
          parentId: destination.parentId ?? null,
          sortOrder: appendBase,
          permissions: rootPermissions,
        });
        copiedPages.push({
          id: root.id,
          sourcePageId: sourcePage.id,
          title: destination.rootTitle,
          parentId: destination.parentId ?? null,
        });
      } else {
        const destinationPage = targetContext.pagesById.get(destination.pageId);
        if (!destinationPage)
          throw new Error("Destination page is missing from the context");
        root = { id: destinationPage.id, slug: destinationPage.slug };
      }

      const newIdByOldId = new Map([[sourcePage.id, root.id]]);

      /** Subtree entries are depth-first: parents always precede children */
      for (const { page, visibleParentId } of subtree) {
        const parentId = newIdByOldId.get(visibleParentId)!;
        const copy = await createCopy(page, {
          title: page.title,
          slug: page.slug,
          parentId,
          sortOrder: rebasedSortOrders.get(page.id) ?? page.sortOrder,
          permissions: inheritedPermissions,
        });
        newIdByOldId.set(page.id, copy.id);
        copiedPages.push({
          id: copy.id,
          sourcePageId: page.id,
          title: page.title,
          parentId,
        });
      }

      return { root, copiedPages };
    },
    { timeout: TRANSACTION_TIMEOUT_MS },
  );
};
