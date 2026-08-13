"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getWikiScopeRevalidationPath } from "../queries/getWikiPageScopedContext";
import { requireAdminableWikiPage } from "../utils/requireAdminableWikiPage";
import { slugifyWikiPageTitle } from "../utils/slugifyWikiPageTitle";

const schema = z.object({
  id: z.cuid2(),
  title: z.string().trim().min(1).max(128),
});

export const renameWikiPage = createAuthenticatedAction(
  "renameWikiPage",
  schema,
  async (formData, authentication, data, t) => {
    const { scoped, page, failure } = await requireAdminableWikiPage(
      data.id,
      formData,
      t,
      { rejectEventWikiRootPage: true },
    );
    if (failure) return failure;

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
          eventId: page.eventId ?? undefined,
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
