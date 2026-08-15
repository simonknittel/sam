"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { z } from "zod";
import { revalidateGlobalWikiScope } from "../queries/getWikiPageScopedContext";

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
      select: { id: true, pageId: true, resolvedAt: true },
    });
    if (!report)
      return { error: t("Common.notFound"), requestPayload: formData };
    if (report.resolvedAt)
      return {
        error: "Diese Meldung wurde bereits bearbeitet.",
        requestPayload: formData,
      };

    await prisma.wikiPageReport.update({
      where: { id: report.id },
      data: {
        resolvedAt: new Date(),
        resolvedById: authentication.session.entity.id,
        resolutionComment: data.resolutionComment ?? null,
      },
    });

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

    revalidateGlobalWikiScope();

    return { success: "Meldung als bearbeitet markiert." };
  },
);
