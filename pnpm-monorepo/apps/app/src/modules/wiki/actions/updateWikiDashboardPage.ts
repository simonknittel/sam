"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getWikiContext } from "../queries/getWikiContext";
import { WIKI_SETTING_DASHBOARD_PAGE } from "../queries/getWikiSettings";

const schema = z.object({
  /** Empty string unsets the dashboard page */
  pageId: z.union([z.cuid2(), z.literal("")]),
});

/**
 * Picks the single wiki page rendered on the app dashboard. Global
 * curation, so it stays with `wiki;manage` — page admins manage their own
 * pages, not what the dashboard promotes.
 */
export const updateWikiDashboardPage = createAuthenticatedAction(
  "updateWikiDashboardPage",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("wiki", "manage")))
      return { error: t("Common.forbidden"), requestPayload: formData };

    if (data.pageId) {
      const context = await getWikiContext();
      const page = context?.pagesById.get(data.pageId);
      if (!page || page.deletedAt)
        return { error: t("Common.badRequest"), requestPayload: formData };
    }

    const updatedById = authentication.session.entity?.id ?? null;
    if (data.pageId) {
      await prisma.wikiSetting.upsert({
        where: { key: WIKI_SETTING_DASHBOARD_PAGE },
        update: { value: data.pageId, updatedById },
        create: {
          key: WIKI_SETTING_DASHBOARD_PAGE,
          value: data.pageId,
          updatedById,
        },
      });
    } else {
      await prisma.wikiSetting.deleteMany({
        where: { key: WIKI_SETTING_DASHBOARD_PAGE },
      });
    }

    await createAuditEvents([
      {
        type: AuditEventType.WIKI_SETTINGS_UPDATED,
        data: {
          setting: WIKI_SETTING_DASHBOARD_PAGE,
          value: data.pageId,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath("/app/dashboard");
    // The settings page shows the current value
    revalidatePath("/app/wiki", "layout");

    return { success: t("Common.successfullySaved") };
  },
);
