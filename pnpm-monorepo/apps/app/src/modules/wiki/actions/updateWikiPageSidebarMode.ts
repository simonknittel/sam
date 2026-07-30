"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { WikiPageSidebarMode } from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getWikiContext } from "../queries/getWikiContext";

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
    const context = await getWikiContext();
    if (!context)
      return { error: t("Common.forbidden"), requestPayload: formData };

    const page = context.pagesById.get(data.id);
    if (!page || page.deletedAt)
      return { error: t("Common.badRequest"), requestPayload: formData };
    if (!context.permissions.get(page.id)?.canAdmin)
      return { error: t("Common.forbidden"), requestPayload: formData };

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
          previousSidebarMode: page.sidebarMode,
          newSidebarMode: data.sidebarMode,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath("/app/wiki", "layout");

    return { success: t("Common.successfullySaved") };
  },
);
