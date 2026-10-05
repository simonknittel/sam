"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { rejectConflict } from "@/modules/actions/utils/rejectConflict";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { refresh } from "next/cache";
import * as z from "zod";

const schema = z.object({
  reportId: z.cuid2(),
  resolutionComment: z
    .string()
    .trim()
    .max(2048)
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export const resolveWikiPageReport = createAuthenticatedAction(
  "resolveWikiPageReport",
  schema,
  async (formData, authentication, data, t) => {
    if (
      !(await authentication.authorize("wiki", "manage")) ||
      !authentication.session.entity
    )
      return { error: t("Common.forbidden"), requestPayload: formData };

    const report = await prisma.wikiPageReport.findUnique({
      where: { id: data.reportId },
      select: { id: true, pageId: true },
    });
    if (!report) {
      /**
       * The permanent delete of its page removed the report before, and the
       * page must show it
       */
      return rejectConflict(t("Common.notFound"), formData);
    }

    /**
     * The condition on `resolvedAt` makes the check and the write one step:
     * of two managers at the same time, only one resolves the report
     */
    const { count } = await prisma.wikiPageReport.updateMany({
      where: { id: report.id, resolvedAt: null },
      data: {
        resolvedAt: new Date(),
        resolvedById: authentication.session.entity.id,
        resolutionComment: data.resolutionComment ?? null,
      },
    });

    /**
     * Also when a different manager resolved the report before: the page
     * must show it
     */
    refresh();

    if (count === 0)
      return {
        error: "Diese Meldung wurde bereits bearbeitet.",
        requestPayload: formData,
      };

    await createAuditEvents([
      {
        type: AuditEventType.WIKI_PAGE_REPORT_RESOLVED,
        data: {
          reportId: report.id,
          pageId: report.pageId,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    return { success: "Meldung als bearbeitet markiert." };
  },
);
