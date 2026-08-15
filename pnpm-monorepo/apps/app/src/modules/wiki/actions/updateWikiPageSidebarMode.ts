"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { WikiPageSidebarMode } from "@sam-monorepo/database/client";
import { z } from "zod";
import { revalidateWikiScope } from "../queries/getWikiPageScopedContext";
import { requireAdminableWikiPage } from "../utils/requireAdminableWikiPage";

const schema = z.object({
  id: z.cuid2(),
  sidebarMode: z.enum(WikiPageSidebarMode),
});

/**
 * Changes how a page shows up in the tree sidebar (see WikiPageSidebarMode).
 * Purely cosmetic — never a permission — but structural for everyone's
 * navigation, therefore page-admin-gated like move/rename/delete.
 */
export const updateWikiPageSidebarMode = createAuthenticatedAction(
  "updateWikiPageSidebarMode",
  schema,
  async (formData, authentication, data, t) => {
    const { scoped, page, failure } = await requireAdminableWikiPage(
      data.id,
      formData,
      t,
      { rejectEventWikiRootPage: true },
    );
    if (failure) return failure;

    if (page.sidebarMode === data.sidebarMode)
      return { success: t("Common.successfullySaved") };

    await prisma.wikiPage.update({
      where: { id: page.id },
      data: {
        sidebarMode: data.sidebarMode,
        updatedById: authentication.session.entity?.id ?? null,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.WIKI_PAGE_SIDEBAR_MODE_UPDATED,
        data: {
          pageId: page.id,
          eventId: page.eventId ?? undefined,
          previousSidebarMode: page.sidebarMode,
          newSidebarMode: data.sidebarMode,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidateWikiScope(scoped);

    return { success: t("Common.successfullySaved") };
  },
);
