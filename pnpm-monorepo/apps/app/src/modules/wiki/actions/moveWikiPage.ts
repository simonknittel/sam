"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import * as z from "zod";
import { revalidateWikiScope } from "../queries/getWikiPageScopedContext";
import { isEventWikiRootPage } from "../utils/isEventWikiRootPage";
import {
  buildWikiPageReparentAuditEvents,
  buildWikiPageReparentReset,
  isWikiPageReparentRefused,
  validateWikiPageReparent,
  WIKI_PAGE_TREE_CHANGED_ERROR,
} from "../utils/reparentWikiPage";
import { requireAdminableWikiPage } from "../utils/requireAdminableWikiPage";

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

    const reparentFailure = await validateWikiPageReparent(
      scoped,
      page,
      newParentId,
      authentication,
      formData,
      t,
    );
    if (reparentFailure) return reparentFailure;

    const siblings = context.pages.filter(
      (sibling) => sibling.parentId === newParentId && sibling.id !== page.id,
    );
    const sortOrder =
      siblings.length > 0
        ? Math.max(...siblings.map((sibling) => sibling.sortOrder)) + 1
        : 0;

    const reset = buildWikiPageReparentReset(
      scoped,
      page,
      newParentId,
      authentication.session.entity?.id ?? null,
    );

    try {
      await prisma.$transaction([
        ...reset.statements,
        prisma.wikiPage.update({
          where: { id: page.id },
          data: {
            parentId: newParentId,
            sortOrder,
            updatedById: authentication.session.entity?.id ?? null,
          },
        }),
      ]);
    } catch (error) {
      if (isWikiPageReparentRefused(error))
        return {
          error: WIKI_PAGE_TREE_CHANGED_ERROR,
          requestPayload: formData,
        };
      throw error;
    }

    await createAuditEvents(
      buildWikiPageReparentAuditEvents(
        page,
        newParentId,
        reset.subtreeIds,
        authentication.session.user.id,
      ),
    );

    revalidateWikiScope(scoped);

    return {
      success:
        reset.subtreeIds.length > 1
          ? `Erfolgreich verschoben. Die Seite und ${reset.subtreeIds.length - 1} Unterseite(n) übernehmen jetzt die Berechtigungen des neuen Elternteils.`
          : "Erfolgreich verschoben. Die Seite übernimmt jetzt die Berechtigungen des neuen Elternteils.",
    };
  },
);
