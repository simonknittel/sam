import {
  WikiPageEventScope,
  WikiPageNamespace,
  type Prisma,
} from "@sam-monorepo/database/client";
import {
  eventContainerColumns,
  type EventContainer,
} from "@sam-monorepo/domain";
import type { WikiSharedContextPage } from "./wikiContext.js";
import type { WikiPagePermissionColumns } from "./wikiPageDefaults.js";
import { findOrCreateWikiTags, toWikiPageTagsText } from "./wikiTags.js";

export interface CopiedWikiPage {
  readonly id: string;
  readonly sourcePageId: string;
  readonly title: string;
  readonly parentId: string | null;
}

/** One page to create, in depth-first order (parents before their children) */
export interface WikiPageCopyEntry {
  readonly source: Pick<
    WikiSharedContextPage,
    | "id"
    | "sidebarMode"
    | "iconId"
    | "imageUploadability"
    | "attachmentUploadability"
  >;
  readonly title: string;
  readonly slug: string;
  /**
   * Source id of the page whose copy becomes the parent. NULL places the
   * copy directly under `rootParentId`.
   */
  readonly parentSourceId: string | null;
  readonly sortOrder: number;
  readonly permissions: WikiPagePermissionColumns;
}

interface CopyWikiPagesParams {
  readonly entries: readonly WikiPageCopyEntry[];
  /** NULL copies into the global wiki */
  readonly targetContainer: EventContainer | null;
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
   * map. Used by the briefing copy (`copyBriefingTree`), where those scopes
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
  readonly slugBySourceId: Map<string, string>;
}

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
 * transaction. The shared core of every wiki copy: the subtree copy of the
 * app and the briefing copy (`copyBriefingTree`).
 *
 * Content (including the Yjs document) is copied from the last persisted
 * state — unsaved changes of a live collab session are not included. Images
 * and attachments keep referencing the source pages' uploads; each copy
 * gets the upload links of its source page (WikiPage.uploads), which agree
 * with the copied content, so attachment downloads are permission-checked
 * against the copy itself and the upload cleanup keeps them. Tags carry over
 * by name: found or created in the target scope (see findOrCreateWikiTags),
 * which links the identical tag on a same-scope copy and recreates it on a
 * cross-scope one.
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
        uploads: { select: { uploadId: true, kind: true } },
      },
    }),
    transaction.wikiPageTag.findMany({
      where: { pageId: { in: sourcePageIds } },
      select: { pageId: true, tag: { select: { name: true } } },
    }),
  ]);
  const contentById = new Map(contentRows.map((row) => [row.id, row]));
  const tagAssignmentsByPageId = Map.groupBy(
    tagAssignments,
    (assignment) => assignment.pageId,
  );

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

  const tagsOf = async (sourcePageId: string) => {
    const tags = await findOrCreateWikiTags(
      transaction,
      (tagAssignmentsByPageId.get(sourcePageId) ?? []).map(
        (assignment) => assignment.tag.name,
      ),
      params.targetContainer,
      params.createdByEntityId,
    );
    return {
      tagIds: tags.map((tag) => tag.id),
      tagsText: toWikiPageTagsText(tags.map((tag) => tag.name)),
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
    const { tagIds, tagsText } = await tagsOf(entry.source.id);

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
        uploads:
          content && content.uploads.length > 0
            ? { createMany: { data: content.uploads } }
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
