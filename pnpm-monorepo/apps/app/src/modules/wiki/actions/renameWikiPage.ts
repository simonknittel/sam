"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getWikiPageScopedContext,
  getWikiScopeRevalidationPath,
  isWikiScopeFrozen,
} from "../queries/getWikiPageScopedContext";
import { isEventWikiRootPage } from "../utils/isEventWikiRootPage";
import { slugifyWikiPageTitle } from "../utils/slugifyWikiPageTitle";

const schema = z.object({
  id: z.cuid2(),
  title: z.string().trim().min(1).max(128),
});

export const renameWikiPage = createAuthenticatedAction(
  "renameWikiPage",
  schema,
  async (formData, authentication, data, t) => {
    const scoped = await getWikiPageScopedContext(data.id);
    if (!scoped)
      return { error: t("Common.forbidden"), requestPayload: formData };
    const context = scoped.context;

    const page = context.pagesById.get(data.id);
    if (!page || page.deletedAt)
      return { error: t("Common.badRequest"), requestPayload: formData };
    if (!context.permissions.get(page.id)?.canAdmin)
      return { error: t("Common.forbidden"), requestPayload: formData };
    if (isWikiScopeFrozen(scoped))
      return {
        error: "Das Event ist bereits vorbei.",
        requestPayload: formData,
      };
    /** The event wiki's locked root page cannot be changed structurally */
    if (isEventWikiRootPage(page))
      return { error: t("Common.badRequest"), requestPayload: formData };

    await prisma.wikiPage.update({
      where: { id: page.id },
      data: {
        title: data.title,
        slug: slugifyWikiPageTitle(data.title),
        updatedById: authentication.session.entity?.id ?? null,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.WIKI_PAGE_RENAMED,
        data: {
          pageId: page.id,
          previousTitle: page.title,
          newTitle: data.title,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath(getWikiScopeRevalidationPath(scoped), "layout");

    return { success: t("Common.successfullySaved") };
  },
);
