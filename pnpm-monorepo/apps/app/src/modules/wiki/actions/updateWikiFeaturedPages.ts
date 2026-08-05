"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getWikiContext } from "../queries/getWikiContext";
import { WIKI_SETTING_FEATURED_PAGES } from "../queries/getWikiSettings";
import { MAX_WIKI_FEATURED_PAGES } from "../utils/wikiFeaturedPages";

const schema = z.object({
  /** One `pageId` form field per page, in the order they are featured */
  pageIds: z
    .array(z.cuid2())
    .max(MAX_WIKI_FEATURED_PAGES)
    .transform((values) => [...new Set(values)]),
});

/**
 * Replaces the whole featured list of the wiki landing page. Featuring is
 * global curation, so it stays with `wiki;manage` — page admins manage
 * their own pages, not what the landing page promotes.
 */
export const updateWikiFeaturedPages = createAuthenticatedAction(
  "updateWikiFeaturedPages",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("wiki", "manage")))
      return { error: t("Common.forbidden"), requestPayload: formData };

    const context = await getWikiContext();
    if (!context)
      return { error: t("Common.forbidden"), requestPayload: formData };

    const allPagesExist = data.pageIds.every(
      (pageId) => context.pagesById.get(pageId)?.deletedAt === null,
    );
    if (!allPagesExist)
      return { error: t("Common.badRequest"), requestPayload: formData };

    const updatedById = authentication.session.entity?.id ?? null;
    await prisma.wikiSetting.upsert({
      where: { key: WIKI_SETTING_FEATURED_PAGES },
      update: { value: data.pageIds, updatedById },
      create: {
        key: WIKI_SETTING_FEATURED_PAGES,
        value: data.pageIds,
        updatedById,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.WIKI_SETTINGS_UPDATED,
        data: {
          setting: WIKI_SETTING_FEATURED_PAGES,
          value: data.pageIds,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath("/app/wiki", "layout");

    return { success: t("Common.successfullySaved") };
  },
  {
    parseFormData: (formData) => ({ pageIds: formData.getAll("pageId") }),
  },
);
