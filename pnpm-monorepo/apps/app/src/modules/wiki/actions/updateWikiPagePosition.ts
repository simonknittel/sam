"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getWikiScopeRevalidationPath } from "../queries/getWikiPageScopedContext";
import { buildEventWikiPageMoveReset } from "../utils/buildEventWikiPageMoveReset";
import { buildWikiPageMoveReset } from "../utils/buildWikiPageMoveReset";
import { collectWikiPageDescendants } from "../utils/collectWikiPageDescendants";
import { compareWikiPagesByOrder } from "../utils/compareWikiPagesByOrder";
import { isEventWikiRootPage } from "../utils/isEventWikiRootPage";
import { requireAdminableWikiPage } from "../utils/requireAdminableWikiPage";
import {
  resolveWikiPagePlacement,
  WikiPagePlacement,
} from "../utils/resolveWikiPagePlacement";
import { WikiScope } from "../utils/wikiPageHref";

const schema = z.object({
  id: z.cuid2(),
  referenceId: z.cuid2(),
  position: z.enum(["before", "after", "inside"]),
});

/**
 * Drops the page at a new position in the sidebar tree: before/after the
 * reference page (adopting the reference's parent) or as the reference's
 * first subpage. The siblings of the target parent are renumbered
 * sequentially so pages with identical sortOrder (e.g. after a move) become
 * distinct. Reordering within the same parent is deliberately unaudited
 * (cosmetic change, no audit event by design); adopting a different parent
 * creates the same audit event as moveWikiPage.
 */
export const updateWikiPagePosition = createAuthenticatedAction(
  "updateWikiPagePosition",
  schema,
  async (formData, authentication, data, t) => {
    const { scoped, page, failure } = await requireAdminableWikiPage(
      data.id,
      formData,
      t,
    );
    if (failure) return failure;
    const context = scoped.context;
    /** The event wiki's locked root page can never be moved */
    if (isEventWikiRootPage(page))
      return { error: t("Common.badRequest"), requestPayload: formData };

    const reference = context.pagesById.get(data.referenceId);
    if (!reference || reference.deletedAt || reference.id === page.id)
      return { error: t("Common.badRequest"), requestPayload: formData };

    const newParentId =
      data.position === "inside" ? reference.id : reference.parentId;
    const changesParent = newParentId !== page.parentId;

    /** Same checks as moveWikiPage when the page changes its parent */
    if (changesParent) {
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
         * Prevent cycles: the new parent must not be the page itself or one
         * of its descendants.
         */
        if (
          newParentId === page.id ||
          collectWikiPageDescendants(context.pages, page.id).includes(
            newParentId,
          )
        )
          return { error: t("Common.badRequest"), requestPayload: formData };
      } else {
        /** Event wikis have exactly one top-level page: the locked root */
        if (scoped.scope === WikiScope.Event)
          return { error: t("Common.badRequest"), requestPayload: formData };
        if (!(await authentication.authorize("wiki", "create")))
          return { error: t("Common.forbidden"), requestPayload: formData };
      }
    }

    const newSiblings = context.pages
      .filter(
        (sibling) => sibling.parentId === newParentId && sibling.id !== page.id,
      )
      .toSorted(compareWikiPagesByOrder);
    if (data.position === "inside") {
      newSiblings.unshift(page);
    } else {
      const index = newSiblings.findIndex(
        (sibling) => sibling.id === reference.id,
      );
      newSiblings.splice(
        data.position === "before" ? index : index + 1,
        0,
        page,
      );
    }

    const updatedById = authentication.session.entity?.id ?? null;
    const updates = newSiblings.flatMap((sibling, index) => {
      const changed =
        sibling.sortOrder !== index ||
        (sibling.id === page.id && changesParent);
      if (!changed) return [];
      return [
        prisma.wikiPage.update({
          where: { id: sibling.id },
          data:
            sibling.id === page.id
              ? { parentId: newParentId, sortOrder: index, updatedById }
              : { sortOrder: index, updatedById },
        }),
      ];
    });
    /** Same permission reset as moveWikiPage, see there */
    const reset = changesParent
      ? scoped.scope === WikiScope.Event
        ? buildEventWikiPageMoveReset(context.allPages, page.id)
        : buildWikiPageMoveReset(
            scoped.context.allPages,
            scoped.context.pagesById.get(page.id)!,
            newParentId,
            updatedById,
          )
      : null;

    if (updates.length > 0 || reset)
      await prisma.$transaction([...updates, ...(reset?.statements ?? [])]);

    if (reset)
      await createAuditEvents([
        {
          type: AuditEventType.WIKI_PAGE_MOVED,
          data: {
            pageId: page.id,
            eventId: page.eventId ?? undefined,
            previousParentId: page.parentId,
            newParentId,
          },
          createdById: authentication.session.user.id,
        },
        ...reset.subtreeIds.map((id) => ({
          type: AuditEventType.WIKI_PAGE_PERMISSIONS_RESET_BY_MOVE as const,
          data: {
            pageId: id,
            eventId: page.eventId ?? undefined,
            movedPageId: page.id,
            newParentId,
          },
          createdById: authentication.session.user.id,
        })),
      ]);

    revalidatePath(getWikiScopeRevalidationPath(scoped), "layout");

    return {
      success: reset
        ? "Erfolgreich verschoben. Die Seite und ihre Unterseiten übernehmen jetzt die Berechtigungen des neuen Elternteils."
        : t("Common.successfullySaved"),
    };
  },
);
