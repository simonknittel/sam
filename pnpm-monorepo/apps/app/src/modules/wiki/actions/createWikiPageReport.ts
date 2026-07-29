"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getWikiContext } from "../queries/getWikiContext";

/** Simple abuse guard: at most this many unresolved reports per user */
const MAX_OPEN_REPORTS_PER_USER = 5;

const schema = z.object({
  pageId: z.cuid2(),
  message: z.string().trim().min(1).max(2048),
});

export const createWikiPageReport = createAuthenticatedAction(
  "createWikiPageReport",
  schema,
  async (formData, authentication, data, t) => {
    const context = await getWikiContext();
    const citizenId = authentication.session.entity?.id;
    if (!context || !citizenId)
      return { error: t("Common.forbidden"), requestPayload: formData };

    const page = context.pagesById.get(data.pageId);
    if (!page || page.deletedAt || !context.permissions.get(page.id)?.canRead)
      return { error: t("Common.notFound"), requestPayload: formData };

    const openReports = await prisma.wikiPageReport.count({
      where: { createdById: citizenId, resolvedAt: null },
    });
    if (openReports >= MAX_OPEN_REPORTS_PER_USER)
      return {
        error:
          "Du hast bereits zu viele offene Meldungen. Bitte warte, bis diese bearbeitet wurden.",
        requestPayload: formData,
      };

    const report = await prisma.wikiPageReport.create({
      data: {
        pageId: page.id,
        message: data.message,
        createdById: citizenId,
      },
      select: { id: true },
    });

    await createAuditEvents([
      {
        type: AuditEventType.WIKI_PAGE_REPORTED,
        data: {
          reportId: report.id,
          pageId: page.id,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    await triggerNotifications([
      {
        type: "WikiPageReported",
        payload: {
          reportId: report.id,
        },
      },
    ]);

    revalidatePath("/app/wiki", "layout");

    return { success: "Meldung gesendet." };
  },
);
