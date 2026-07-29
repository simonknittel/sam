"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getWikiContext } from "../queries/getWikiContext";
import { WIKI_SETTING_SUPPORT_PAGE_ID } from "../queries/getWikiSettings";

const schema = z.object({
  /** Empty string unsets the support page */
  supportPageId: z.union([z.cuid2(), z.literal("")]),
});

export const updateWikiSupportPage = createAuthenticatedAction(
  "updateWikiSupportPage",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("wiki", "manage")))
      return { error: t("Common.forbidden"), requestPayload: formData };

    if (data.supportPageId) {
      const context = await getWikiContext();
      const page = context?.pagesById.get(data.supportPageId);
      if (!page || page.deletedAt)
        return { error: t("Common.badRequest"), requestPayload: formData };
    }

    const updatedById = authentication.session.entity?.id ?? null;
    if (data.supportPageId) {
      await prisma.wikiSetting.upsert({
        where: { key: WIKI_SETTING_SUPPORT_PAGE_ID },
        update: { value: data.supportPageId, updatedById },
        create: {
          key: WIKI_SETTING_SUPPORT_PAGE_ID,
          value: data.supportPageId,
          updatedById,
        },
      });
    } else {
      await prisma.wikiSetting.deleteMany({
        where: { key: WIKI_SETTING_SUPPORT_PAGE_ID },
      });
    }

    await createAuditEvents([
      {
        type: AuditEventType.WIKI_SETTINGS_UPDATED,
        data: {
          setting: WIKI_SETTING_SUPPORT_PAGE_ID,
          value: data.supportPageId,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath("/app/wiki", "layout");

    return { success: t("Common.successfullySaved") };
  },
);
