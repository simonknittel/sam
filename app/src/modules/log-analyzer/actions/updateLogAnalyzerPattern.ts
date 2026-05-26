"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { z } from "zod";

const schema = z.object({
  id: z.cuid2(),
  title: z.string().trim().min(1).max(255),
  regExp: z.string().trim().min(1),
  messageTemplate: z.string().trim().min(1),
});

export const updateLogAnalyzerPattern = createAuthenticatedAction(
  "updateLogAnalyzerPattern",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("logAnalyzerPattern", "manage")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    const existingPattern = await prisma.logAnalyzerPattern.findFirst({
      where: {
        id: data.id,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
      },
    });
    if (!existingPattern)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };

    const updatedPattern = await prisma.logAnalyzerPattern.update({
      where: {
        id: data.id,
      },
      data: {
        title: data.title,
        regExp: data.regExp,
        messageTemplate: data.messageTemplate,
        updatedBy: {
          connect: {
            id: authentication.session.entity.id,
          },
        },
      },
      select: {
        id: true,
        title: true,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.LOG_ANALYZER_PATTERN_UPDATED,
        data: {
          patternId: updatedPattern.id,
          previousTitle: existingPattern.title,
          newTitle: data.title,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
