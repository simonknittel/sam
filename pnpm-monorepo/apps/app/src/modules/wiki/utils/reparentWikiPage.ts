import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import type { authenticate } from "@/modules/auth/server";
import type { getTranslations } from "next-intl/server";
import { buildEventWikiPageMoveReset } from "./buildEventWikiPageMoveReset";
import { buildWikiPageMoveReset } from "./buildWikiPageMoveReset";
import { collectWikiPageDescendants } from "./collectWikiPageDescendants";
import type { ScopedContext, ScopedWikiPage } from "./requireAdminableWikiPage";
import {
  resolveWikiPagePlacement,
  WikiPagePlacement,
} from "./resolveWikiPagePlacement";
import { WikiScope } from "./wikiPageHref";

type Authentication = NonNullable<
  Exclude<Awaited<ReturnType<typeof authenticate>>, false>
>;

/**
 * The reparent rules shared by moveWikiPage and updateWikiPagePosition: a
 * page adopting a new parent must land on an adminable target without
 * creating a cycle; moving to the top level is barred in event wikis and
 * requires the global wiki create permission. Returns the error response
 * the action should return as-is, or null when the reparent is allowed.
 */
export const validateWikiPageReparent = async (
  scoped: ScopedContext,
  page: ScopedWikiPage,
  newParentId: string | null,
  authentication: Authentication,
  formData: FormData,
  t: Awaited<ReturnType<typeof getTranslations>>,
) => {
  const context = scoped.context;

  if (newParentId) {
    const placement = resolveWikiPagePlacement(context, newParentId);
    if (placement !== WikiPagePlacement.Allowed)
      return {
        error:
          placement === WikiPagePlacement.Missing
            ? t("Common.badRequest")
            : t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Prevent cycles: the new parent must not be the page itself or one of
     * its descendants.
     */
    if (
      newParentId === page.id ||
      collectWikiPageDescendants(context.pages, page.id).includes(newParentId)
    )
      return { error: t("Common.badRequest"), requestPayload: formData };
  } else {
    /** Event wikis have exactly one top-level page: the locked root */
    if (scoped.scope === WikiScope.Event)
      return { error: t("Common.badRequest"), requestPayload: formData };
    if (!(await authentication.authorize("wiki", "create")))
      return { error: t("Common.forbidden"), requestPayload: formData };
  }

  return null;
};

/**
 * A moved page and its subtree take the permissions of their new place —
 * the same reset on both reparent paths.
 */
export const buildWikiPageReparentReset = (
  scoped: ScopedContext,
  page: ScopedWikiPage,
  newParentId: string | null,
  updatedById: string | null,
) =>
  scoped.scope === WikiScope.Event
    ? buildEventWikiPageMoveReset(scoped.context.allPages, page.id)
    : buildWikiPageMoveReset(
        scoped.context.allPages,
        scoped.context.pagesById.get(page.id)!,
        newParentId,
        updatedById,
      );

/**
 * The move audit event plus one permission-reset event per page in the
 * moved subtree.
 */
export const buildWikiPageReparentAuditEvents = (
  page: ScopedWikiPage,
  newParentId: string | null,
  subtreeIds: string[],
  createdById: string,
) => [
  {
    type: AuditEventType.WIKI_PAGE_MOVED as const,
    data: {
      pageId: page.id,
      eventId: page.eventId ?? undefined,
      previousParentId: page.parentId,
      newParentId,
    },
    createdById,
  },
  ...subtreeIds.map((id) => ({
    type: AuditEventType.WIKI_PAGE_PERMISSIONS_RESET_BY_MOVE as const,
    data: {
      pageId: id,
      eventId: page.eventId ?? undefined,
      movedPageId: page.id,
      newParentId,
    },
    createdById,
  })),
];
