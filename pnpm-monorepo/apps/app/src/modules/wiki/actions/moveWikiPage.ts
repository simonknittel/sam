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
import { isEventWikiRootPage } from "../utils/isEventWikiRootPage";
import { requireAdminableWikiPage } from "../utils/requireAdminableWikiPage";
import {
  resolveWikiPagePlacement,
  WikiPagePlacement,
} from "../utils/resolveWikiPagePlacement";
import { WikiScope } from "../utils/wikiPageHref";

const schema = z.object({
  id: z.cuid2(),
  /** Empty string moves the page to the top level */
  newParentId: z.union([z.cuid2(), z.literal("")]),
});

export const moveWikiPage = createAuthenticatedAction(
  "moveWikiPage",
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

    const newParentId = data.newParentId === "" ? null : data.newParentId;

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

    const siblings = context.pages.filter(
      (sibling) => sibling.parentId === newParentId && sibling.id !== page.id,
    );
    const sortOrder =
      siblings.length > 0
        ? Math.max(...siblings.map((sibling) => sibling.sortOrder)) + 1
        : 0;

    const reset =
      scoped.scope === WikiScope.Event
        ? buildEventWikiPageMoveReset(context.allPages, page.id)
        : buildWikiPageMoveReset(
            scoped.context.allPages,
            scoped.context.pagesById.get(page.id)!,
            newParentId,
            authentication.session.entity?.id ?? null,
          );

    await prisma.$transaction([
      prisma.wikiPage.update({
        where: { id: page.id },
        data: {
          parentId: newParentId,
          sortOrder,
          updatedById: authentication.session.entity?.id ?? null,
        },
      }),
      ...reset.statements,
    ]);

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
      success:
        reset.subtreeIds.length > 1
          ? `Erfolgreich verschoben. Die Seite und ${reset.subtreeIds.length - 1} Unterseite(n) übernehmen jetzt die Berechtigungen des neuen Elternteils.`
          : "Erfolgreich verschoben. Die Seite übernimmt jetzt die Berechtigungen des neuen Elternteils.",
    };
  },
);
