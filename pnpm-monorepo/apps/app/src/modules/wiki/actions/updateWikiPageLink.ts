"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getWikiContext } from "../queries/getWikiContext";
import {
  WIKI_PAGE_LINK_KEYS,
  wikiPageLinkSettingKey,
} from "../utils/wikiPageLinks";

const schema = z.object({
  key: z.enum(WIKI_PAGE_LINK_KEYS),
  /** Empty string unsets the link */
  pageId: z.union([z.cuid2(), z.literal("")]),
});

export const updateWikiPageLink = createAuthenticatedAction(
  "updateWikiPageLink",
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

    const settingKey = wikiPageLinkSettingKey(data.key);
    const updatedById = authentication.session.entity?.id ?? null;
    if (data.pageId) {
      await prisma.wikiSetting.upsert({
        where: { key: settingKey },
        update: { value: data.pageId, updatedById },
        create: {
          key: settingKey,
          value: data.pageId,
          updatedById,
        },
      });
    } else {
      await prisma.wikiSetting.deleteMany({
        where: { key: settingKey },
      });
    }

    await createAuditEvents([
      {
        type: AuditEventType.WIKI_SETTINGS_UPDATED,
        data: {
          setting: settingKey,
          value: data.pageId,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    // Page links render in the root app layout (topbar, mobile action bar),
    // not only under /app/wiki
    revalidatePath("/app", "layout");

    return { success: t("Common.successfullySaved") };
  },
);
